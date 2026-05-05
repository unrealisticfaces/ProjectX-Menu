const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const { machineIdSync } = require('node-machine-id');
const admin = require("firebase-admin");

// ==========================================
// 🔥 FIREBASE URLS (TWO DATABASES) 🔥
// ==========================================
// 1. Paste your LICENSING Database URL here:
const LICENSING_DB_URL = "https://projectx-data-default-rtdb.asia-southeast1.firebasedatabase.app";

// 2. Paste your STORE MANAGER (XP/Users) Database URL here:
const STORE_DB_URL = "https://posinventory-77b87-default-rtdb.firebaseio.com";
// ==========================================

let mainWindow;
let tray = null;
let isQuitting = false;

let expressApp;
let httpServer;
let io;
let db;
let isServerRunning = false;
let fdb = null;

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, '4g_database.db');
const iniPath = path.join(userDataPath, 'admin_log.ini');
const configPath = path.join(userDataPath, 'server_config.json');

// Initialize INI
if (!fs.existsSync(iniPath)) fs.writeFileSync(iniPath, '[AdminLogs]\n');
function writeAdminLog(action) {
  const ts = new Date().toISOString();
  fs.appendFile(iniPath, `${ts}="${action}"\n`, () => {});
}

// ==========================================
// 🔥 INITIALIZE FIREBASE ADMIN (STORE DB) 🔥
// ==========================================
try {
  let keyPath;
  if (app.isPackaged) {
    keyPath = path.join(path.dirname(app.getPath('exe')), 'firebase-admin-key.json');
  } else {
    keyPath = path.join(__dirname, 'firebase-admin-key.json');
  }

  if (!fs.existsSync(keyPath)) {
    throw new Error(`Missing key file! Please place firebase-admin-key.json next to the .exe file.`);
  }

  const rawKey = fs.readFileSync(keyPath, 'utf8');
  const serviceAccount = JSON.parse(rawKey);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: STORE_DB_URL 
  });
  
  fdb = admin.database();
  writeAdminLog("✅ Firebase Admin Key Loaded Successfully!");

  fdb.ref(".info/connected").on("value", function(snap) {
    if (snap.val() === true) {
      writeAdminLog("🌐 Firebase Network Connection Established!");
    } else {
      writeAdminLog("⚠️ Firebase Network Disconnected/Reconnecting...");
    }
  });

} catch (e) {
  writeAdminLog(`❌ Firebase Setup Error: ${e.message}`);
}
// ==========================================

function loadConfig() {
  if (fs.existsSync(configPath)) {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e) {}
  }
  return { ip: '0.0.0.0', port: 3000, licenseKey: null };
}

function saveConfig(config) { fs.writeFileSync(configPath, JSON.stringify(config)); }

function startAutomatedBackups() {
  const backupDir = 'C:\\4G_Server_Backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  setInterval(() => {
    if (fs.existsSync(dbPath)) {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `4g_database_backup_${dateStr}.db`);
      fs.copyFile(dbPath, backupPath, (err) => {
        if (!err) writeAdminLog(`Automated system backup created at ${backupPath}`);
      });
    }
  }, 43200000); 
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push({ name: name, ip: iface.address });
    }
  }
  return ips;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 520,
    resizable: false,
    autoHideMenuBar: true,
    title: "4G Server Control Panel",
    icon: path.join(__dirname, 'icon.ico'), 
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('close', (event) => {
    if (!isQuitting) { event.preventDefault(); mainWindow.hide(); }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico'); 
  let trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKElEQVQ4T2NkoBAwUqifYdQAhtEwGEbDYBgNg2E0DIbRMBiSDAARXAAXGwIQy9w+4gAAAABJRU5ErkJggg==');
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Control Panel', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quit Server Engine', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('4G Gamers Server Engine');
  tray.on('right-click', () => tray.popUpContextMenu(contextMenu));
  tray.on('double-click', () => mainWindow.show());
}

ipcMain.handle('verify-license', async (event, key) => {
  try {
    const hwid = machineIdSync(); 
    const response = await fetch(`${LICENSING_DB_URL}/licenses/${key}.json`);
    const licenseData = await response.json();

    if (!licenseData) return { success: false, message: "Invalid License Key." };
    if (!licenseData.isActive) return { success: false, message: "This License has been revoked by Admin." };

    if (licenseData.hwid === "" || !licenseData.hwid) {
      return { success: false, requiresManualBind: true, hwid: hwid, message: "Key is valid, but pending Admin approval." };
    } 
    
    if (licenseData.hwid === hwid) {
      const config = loadConfig();
      config.licenseKey = key;
      saveConfig(config);
      return { success: true };
    } else {
      return { success: false, message: "Key is already registered to a different computer." };
    }
  } catch (error) {
    return { success: false, message: "Could not connect to activation server." };
  }
});

// ==========================================
// CORE SERVER ENGINE LOGIC
// ==========================================
function startServerEngine(config) {
  if (isServerRunning) return;

  expressApp = express();
  httpServer = http.createServer(expressApp);
  io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

  db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, firstName TEXT, lastName TEXT, email TEXT, password TEXT, xp INTEGER DEFAULT 0, lifetimeXp INTEGER DEFAULT 0, isOnline BOOLEAN DEFAULT false, isAdmin BOOLEAN DEFAULT false, isEnabled BOOLEAN DEFAULT true)`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, username TEXT, itemName TEXT, price INTEGER, timestamp INTEGER, status TEXT DEFAULT 'pending')`);
    db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category TEXT, name TEXT, price INTEGER, imageBase64 TEXT, inStock BOOLEAN DEFAULT true, requiredTier TEXT DEFAULT 'none')`);
    db.run(`CREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY, title TEXT, content TEXT, timestamp INTEGER)`);
    db.run(`CREATE TABLE IF NOT EXISTS top_picks (name TEXT PRIMARY KEY)`);
    db.run(`INSERT OR IGNORE INTO users (username, firstName, lastName, email, password, isAdmin, isEnabled) VALUES ('admin', 'System', 'Admin', 'admin@4g.com', '123', 1, 1)`);
  });

  function broadcastAllUsers() { db.all(`SELECT * FROM users`, [], (err, rows) => { if (!err) io.emit('sync_all_users', rows || []); }); }
  function broadcastInventory() {
    db.all("SELECT * FROM products", [], (err, rows) => {
      if (err) return;
      const inventory = {};
      rows.forEach(row => {
        if (!inventory[row.category]) inventory[row.category] = {};
        inventory[row.category][row.id] = { id: row.id, name: row.name, price: row.price, file: row.imageBase64, inStock: row.inStock === 1 || String(row.inStock) === 'true', requiredTier: row.requiredTier };
      });
      io.emit('sync_inventory', inventory);
    });
  }
  
  function broadcastLeaderboard() { 
    db.all("SELECT username, firstName, lastName, xp, lifetimeXp FROM users WHERE isAdmin = 0 ORDER BY lifetimeXp DESC LIMIT 3", [], (err, rows) => { 
      if (!err) io.emit('sync_leaderboard', rows); 
    }); 
  }
  
  function broadcastNews() { db.all("SELECT * FROM news ORDER BY timestamp DESC", [], (err, rows) => { if (!err) io.emit('sync_news', rows); }); }
  function broadcastTopPicks() { db.all("SELECT name FROM top_picks", [], (err, rows) => { if (!err) io.emit('sync_top_picks', rows.map(r => r.name)); }); }

  let systemConfig = { 
    shopName: "4G GAMERS",
    windowTitle: "4G GAMERS HUB | EARN POINTS",
    logoUrl: "./images/logo/logo2.png",
    heroImageUrl: "./images/logo/logo2.png",
    iconUrl: "./images/logo/logo2.png",
    silverXp: 2000, 
    goldXp: 5000, 
    xpPerHour: 1800, 
    boostMultiplier: 2, 
    enableMidnightBoost: false,
    enableCloudSync: true, 
    subMenus: [
      { id: 'foods', name: 'Foods' },
      { id: 'drinks', name: 'Drinks' },
      { id: 'ecoin', name: 'E-Coin' }
    ]
  };

  const connectedUsers = {}; 
  const claimCooldowns = {};           
  let pendingFirebaseUpdates = {};     

  io.on('connection', (socket) => {
    
    socket.on('disconnect', () => { delete connectedUsers[socket.id]; });

    socket.on('request_initial_data', () => { broadcastInventory(); broadcastNews(); broadcastTopPicks(); socket.emit('sync_config', systemConfig); });
    socket.on('request_leaderboard', () => broadcastLeaderboard());

    socket.on('login', ({ username, password }) => {
      const safeUsername = username.trim().toLowerCase();
      db.get(`SELECT * FROM users WHERE username = ?`, [safeUsername], (err, row) => {
        if (err) return socket.emit('login_error', 'Database error');
        if (row && row.password === password) {
          const isEnabled = row.isEnabled === 1 || String(row.isEnabled) === 'true' || row.isEnabled === null;
          const isAdm = row.isAdmin === 1 || String(row.isAdmin) === 'true';
          if (!isAdm && !isEnabled) return socket.emit('login_error', 'Your account has been disabled.');
          
          connectedUsers[socket.id] = row;
          db.run(`UPDATE users SET isOnline = 1 WHERE username = ?`, [safeUsername]);
          socket.emit('login_success', row); 
          broadcastAllUsers();

          if (fdb && !isAdm && systemConfig.enableCloudSync) {
            fdb.ref(`users/${safeUsername}`).once('value').then((snapshot) => {
              if (snapshot.exists()) {
                const cloudData = snapshot.val();
                db.run(`UPDATE users SET xp = ?, lifetimeXp = ? WHERE username = ?`, [cloudData.xp, cloudData.lifetimeXp, safeUsername]);
                socket.emit('xp_updated', { xp: cloudData.xp, lifetimeXp: cloudData.lifetimeXp });
              }
            }).catch(e => console.error("Firebase background pull failed", e));
          }
        } else { socket.emit('login_error', 'Incorrect username or password'); }
      });
    });

    socket.on('register', ({ username, firstName, lastName, email, password }) => {
      const safeUsername = username.trim().toLowerCase();
      db.run(`INSERT INTO users (username, firstName, lastName, email, password, isEnabled, isAdmin) VALUES (?, ?, ?, ?, ?, 1, 0)`, 
      [safeUsername, firstName, lastName, email, password], function(err) {
          if (err) return socket.emit('login_error', 'Username already exists!');
          
          if(fdb && systemConfig.enableCloudSync) {
            fdb.ref(`users/${safeUsername}`).set({ xp: 0, lifetimeXp: 0, firstName, lastName, email, lastSync: Date.now() }).catch(()=>{});
          }
          
          socket.emit('login_success', { username: safeUsername, firstName, lastName, email, xp: 0, lifetimeXp: 0, isAdmin: 0, isEnabled: 1 }); 
          broadcastAllUsers();
      });
    });

    socket.on('logout', (username) => { 
      if(username) { 
        db.run(`UPDATE users SET isOnline = 0 WHERE username = ?`, [username]); 
        
        if (fdb && systemConfig.enableCloudSync) {
          db.get(`SELECT xp, lifetimeXp FROM users WHERE username = ?`, [username], (err, row) => {
            if (row) fdb.ref(`users/${username}`).update({ xp: row.xp, lifetimeXp: row.lifetimeXp, lastSync: Date.now() }).catch((err)=>{
              writeAdminLog(`❌ Firebase Sync Error for ${username}: ${err.message}`);
            });
          });
        }
        broadcastAllUsers(); delete connectedUsers[socket.id]; 
      } 
    });

    socket.on('update_password', ({ username, currentPassword, newPassword }) => {
      const safeUsername = username.trim().toLowerCase();
      db.get(`SELECT password FROM users WHERE username = ?`, [safeUsername], (err, row) => {
        if (err || !row) return socket.emit('password_update_error', 'User not found.');
        if (row.password !== currentPassword) return socket.emit('password_update_error', 'Incorrect current password.');
        db.run(`UPDATE users SET password = ? WHERE username = ?`, [newPassword, safeUsername], function(err) {
          if (!err) socket.emit('password_update_success', 'Password updated successfully!');
        });
      });
    });

    socket.on('reset_forgot_password', ({ username, firstName, lastName, email }) => {
      const safeUsername = username.trim().toLowerCase();
      db.get(`SELECT firstName, lastName, email FROM users WHERE username = ?`, [safeUsername], (err, row) => {
        if (err || !row) return socket.emit('login_error', 'User account not found.');
        
        if (row.firstName.toLowerCase() !== firstName.trim().toLowerCase() || 
            row.lastName.toLowerCase() !== lastName.trim().toLowerCase() || 
            row.email.toLowerCase() !== email.trim().toLowerCase()) {
            return socket.emit('login_error', 'Verification failed. Details do not match our records.');
        }

        db.run(`UPDATE users SET password = ? WHERE username = ?`, ['123', safeUsername], function(err) {
          if (!err) { 
            socket.emit('password_reset_success', 'Verified! Your password has been reset to 123'); 
            writeAdminLog(`User @${safeUsername} executed a verified self-service password reset.`); 
          }
        });
      });
    });

    socket.on('claim_xp', ({ username, amount }) => {
      if (claimCooldowns[username] && Date.now() - claimCooldowns[username] < 300000) {
        return socket.emit('order_error', 'Please wait 5 minutes before claiming XP again.');
      }
      claimCooldowns[username] = Date.now();

      const safeAmount = Math.min(Math.max(0, amount), 10000); 
      db.run(`UPDATE users SET xp = xp + ?, lifetimeXp = lifetimeXp + ? WHERE username = ?`, [safeAmount, safeAmount, username], function(err) {
          if (!err) {
            db.get(`SELECT xp, lifetimeXp FROM users WHERE username = ?`, [username], (err, row) => { 
              if (row) {
                socket.emit('xp_updated', { xp: row.xp, lifetimeXp: row.lifetimeXp }); 
                
                if (systemConfig.enableCloudSync) {
                  pendingFirebaseUpdates[`users/${username}/xp`] = row.xp;
                  pendingFirebaseUpdates[`users/${username}/lifetimeXp`] = row.lifetimeXp;
                  pendingFirebaseUpdates[`users/${username}/lastSync`] = Date.now();
                }
              }
            });
            broadcastLeaderboard(); broadcastAllUsers();
          }
      });
    });

    socket.on('place_order', ({ username, cartTotal, items }) => {
      db.get(`SELECT xp FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user || user.xp < cartTotal) return socket.emit('order_error', 'Not enough XP');
        db.run(`UPDATE users SET xp = xp - ? WHERE username = ?`, [cartTotal, username], function(err) {
          if (err) return;
          const timestamp = Date.now();
          items.forEach((item, index) => {
            const orderId = `${timestamp}_${index}`;
            db.run(`INSERT INTO orders (id, username, itemName, price, timestamp) VALUES (?, ?, ?, ?, ?)`, [orderId, username, item.item, item.price, timestamp]);
            io.emit('new_live_order', { username, item: item.item, timestamp });
          });
          
          socket.emit('xp_updated', { xp: user.xp - cartTotal }); 
          socket.emit('order_success', 'Order placed successfully!'); 
          broadcastAllUsers();

          if(fdb && systemConfig.enableCloudSync) {
            fdb.ref(`users/${username}`).update({ xp: user.xp - cartTotal, lastSync: Date.now() }).catch((err)=>{
              writeAdminLog(`❌ Firebase Sync Error for ${username}: ${err.message}`);
            });
          }
        });
      });
    });

    socket.on('request_user_history', (username) => { db.all(`SELECT * FROM orders WHERE username = ? ORDER BY timestamp DESC`, [username], (err, rows) => { if (!err) socket.emit('sync_user_history', rows); }); });
    socket.on('request_all_orders', () => { db.all(`SELECT * FROM orders ORDER BY timestamp DESC`, [], (err, rows) => { if (!err) socket.emit('sync_all_orders', rows); }); });
    socket.on('request_all_users', () => { broadcastAllUsers(); });
    
    socket.on('update_order_status', ({ id, status }) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], () => { writeAdminLog(`Processed order ${id} - Status: ${status}`); db.all(`SELECT * FROM orders ORDER BY timestamp DESC`, [], (err, rows) => { if (!err) io.emit('sync_all_orders', rows); }); }); 
    });

    socket.on('admin_update_user', ({ username, firstName, lastName, email, password, isEnabled }) => {
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      const enabledVal = isEnabled ? 1 : 0;
      if (password && password.trim() !== '') {
        db.run(`UPDATE users SET firstName = ?, lastName = ?, email = ?, password = ?, isEnabled = ? WHERE username = ?`, [firstName, lastName, email, password, enabledVal, username], () => { writeAdminLog(`Updated user profile, password, and status for @${username}`); broadcastAllUsers(); });
      } else {
        db.run(`UPDATE users SET firstName = ?, lastName = ?, email = ?, isEnabled = ? WHERE username = ?`, [firstName, lastName, email, enabledVal, username], () => { writeAdminLog(`Updated user profile and status for @${username}`); broadcastAllUsers(); });
      }
    });

    socket.on('admin_toggle_user_status', ({ username, currentStatus }) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`UPDATE users SET isEnabled = ? WHERE username = ?`, [currentStatus ? 1 : 0, username], () => { writeAdminLog(`${currentStatus ? 'Enabled' : 'Disabled'} account access for @${username}`); broadcastAllUsers(); }); 
    });

    socket.on('admin_delete_user', (username) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`DELETE FROM users WHERE username = ?`, [username], () => { writeAdminLog(`Permanently deleted user account @${username}`); broadcastAllUsers(); }); 
    });
    
    socket.on('admin_save_product', ({ category, targetId, productData }) => {
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`INSERT OR REPLACE INTO products (id, category, name, price, imageBase64, inStock, requiredTier) VALUES (?, ?, ?, ?, ?, ?, ?)`, [targetId, category, productData.name, productData.price, productData.file, productData.inStock ? 1 : 0, productData.requiredTier], () => { writeAdminLog(`Saved/Updated product: ${productData.name} in ${category}`); broadcastInventory(); });
    });

    socket.on('admin_delete_product', ({ category, targetId }) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`DELETE FROM products WHERE id = ?`, [targetId], () => { writeAdminLog(`Deleted product ID: ${targetId} from ${category}`); broadcastInventory(); }); 
    });

    socket.on('admin_toggle_stock', ({ category, targetId, currentStock }) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`UPDATE products SET inStock = ? WHERE id = ?`, [currentStock ? 1 : 0, targetId], () => { writeAdminLog(`Toggled stock status for product ID: ${targetId} to ${currentStock ? 'In Stock' : 'Out of Stock'}`); broadcastInventory(); }); 
    });
    
    socket.on('admin_toggle_top_pick', ({ name, isTopPick }) => {
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      if (isTopPick) { db.run(`DELETE FROM top_picks WHERE name = ?`, [name], () => { writeAdminLog(`Removed ${name} from Top Picks`); broadcastTopPicks(); }); } else { db.run(`INSERT OR IGNORE INTO top_picks (name) VALUES (?)`, [name], () => { writeAdminLog(`Added ${name} to Top Picks`); broadcastTopPicks(); }); }
    });

    socket.on('admin_save_news', ({ title, content }) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      const id = `news_${Date.now()}`; db.run(`INSERT INTO news (id, title, content, timestamp) VALUES (?, ?, ?, ?)`, [id, title, content, Date.now()], () => { writeAdminLog(`Posted new announcement: "${title}"`); broadcastNews(); }); 
    });

    socket.on('admin_delete_news', (id) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      db.run(`DELETE FROM news WHERE id = ?`, [id], () => { writeAdminLog(`Deleted announcement ID: ${id}`); broadcastNews(); }); 
    });

    socket.on('update_config', (newConfig) => { 
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      
      const wasCloudOff = !systemConfig.enableCloudSync;
      const isCloudNowOn = newConfig.enableCloudSync;

      systemConfig = newConfig; 
      writeAdminLog(`Updated Global System Configuration parameters`); 
      io.emit('sync_config', systemConfig); 

      // 🔥 THE SMART CATCH-UP LOGIC
      if (wasCloudOff && isCloudNowOn && fdb) {
        writeAdminLog(`☁️ Cloud Sync Re-enabled: Initiating Smart Catch-Up...`);
        
        db.all(`SELECT username, xp, lifetimeXp, firstName, lastName, email FROM users WHERE isAdmin = 0`, [], (err, rows) => {
          if (err || !rows || rows.length === 0) return;
          
          const batchUpdates = {}; 
          rows.forEach(r => {
            batchUpdates[`users/${r.username}/xp`] = r.xp;
            batchUpdates[`users/${r.username}/lifetimeXp`] = r.lifetimeXp;
            batchUpdates[`users/${r.username}/firstName`] = r.firstName || "";
            batchUpdates[`users/${r.username}/lastName`] = r.lastName || "";
            batchUpdates[`users/${r.username}/email`] = r.email || "";
            batchUpdates[`users/${r.username}/lastSync`] = Date.now();
          });
          
          fdb.ref().update(batchUpdates)
            .then(() => {
              writeAdminLog(`✅ Smart Catch-Up Complete: Synced ${rows.length} offline profiles to Firebase in 1 request.`);
            })
            .catch((err) => {
              writeAdminLog(`❌ Firebase Catch-Up Error: ${err.message}`);
            });
        });
      }
    });

    socket.on('request_admin_logs', () => {
      if (!connectedUsers[socket.id] || !connectedUsers[socket.id].isAdmin) return;
      fs.readFile(iniPath, 'utf8', (err, data) => {
        if (err) return socket.emit('sync_admin_logs', []);
        const lines = data.trim().split('\n');
        const logs = lines.map(line => {
          if(line.includes('=')) { const parts = line.split('='); return { timestamp: new Date(parts[0]).toLocaleString(), action: parts.slice(1).join('=').replace(/^"|"$/g, '') }; }
          return null;
        }).filter(Boolean);
        socket.emit('sync_admin_logs', logs.reverse());
      });
    });
  });

  setInterval(() => {
    if (fdb && isServerRunning && systemConfig.enableCloudSync && Object.keys(pendingFirebaseUpdates).length > 0) {
      const batchToPush = { ...pendingFirebaseUpdates };
      pendingFirebaseUpdates = {}; 
      fdb.ref().update(batchToPush).catch((err) => {
         writeAdminLog(`❌ Firebase Micro-Batch Sync Error: ${err.message}`);
      });
    }
  }, 15000);

  setInterval(() => {
    if (!fdb || !isServerRunning || !systemConfig.enableCloudSync) return;
    db.all(`SELECT username, xp, lifetimeXp FROM users WHERE isOnline = 1 AND isAdmin = 0`, [], (err, rows) => {
      if (err || !rows || rows.length === 0) return;
      const batchUpdates = {};
      rows.forEach(r => {
        batchUpdates[`users/${r.username}/xp`] = r.xp;
        batchUpdates[`users/${r.username}/lifetimeXp`] = r.lifetimeXp;
        batchUpdates[`users/${r.username}/lastSync`] = Date.now();
      });
      fdb.ref().update(batchUpdates).catch((err)=>{
         writeAdminLog(`❌ Firebase Heartbeat Sync Error: ${err.message}`);
      });
    });
  }, 10 * 60 * 1000);

  httpServer.listen(config.port, config.ip, () => {
    isServerRunning = true;
    if (mainWindow) mainWindow.webContents.send('server-status-changed', true);
    writeAdminLog(`Server Engine Started on ${config.ip}:${config.port}`);
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startAutomatedBackups();

  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true, path: app.getPath('exe'), args: ['--hidden'] });
  }

  const savedConfig = loadConfig();
  if (savedConfig.licenseKey) {
    const hwid = machineIdSync();
    
    fetch(`${LICENSING_DB_URL}/licenses/${savedConfig.licenseKey}.json`)
      .then(res => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then(licenseData => {
        if (licenseData && licenseData.isActive && licenseData.hwid === hwid) {
          startServerEngine(savedConfig); 
        } else {
          writeAdminLog(`SECURITY ALERT: Blocked unauthorized boot attempt. HWID Mismatch or Revoked Key.`);
          savedConfig.licenseKey = null; 
          saveConfig(savedConfig);       
        }
      })
      .catch(err => {
        writeAdminLog(`Offline boot. Unable to reach activation server, relying on local cache.`);
        startServerEngine(savedConfig);
      });
  }
});

ipcMain.handle('get-server-info', () => {
  const savedConfig = loadConfig();
  return { 
    ips: getLocalIPs(), 
    isRunning: isServerRunning,
    savedIp: savedConfig.ip,
    savedPort: savedConfig.port,
    isActivated: !!savedConfig.licenseKey
  };
});

ipcMain.on('start-server', (event, config) => {
  saveConfig(config);
  startServerEngine(config);
});

ipcMain.on('stop-server', () => {
  if (!isServerRunning) return;
  io.close();
  httpServer.close(() => {
    db.close();
    isServerRunning = false;
    mainWindow.webContents.send('server-status-changed', false);
    writeAdminLog(`Server Engine Stopped`);
  });
});

ipcMain.on('open-data-folder', () => shell.openPath(userDataPath));
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });