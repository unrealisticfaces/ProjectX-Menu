const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const iniPath = path.resolve(__dirname, 'admin_log.ini');
if (!fs.existsSync(iniPath)) {
  fs.writeFileSync(iniPath, '[AdminLogs]\n');
}

function writeAdminLog(action) {
  const ts = new Date().toISOString();
  fs.appendFile(iniPath, `${ts}="${action}"\n`, (err) => {
    if (err) console.error(err);
  });
}

const dbPath = path.resolve(__dirname, '4g_database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, name TEXT, password TEXT, xp INTEGER DEFAULT 0, lifetimeXp INTEGER DEFAULT 0, isOnline BOOLEAN DEFAULT false, isAdmin BOOLEAN DEFAULT false, isEnabled BOOLEAN DEFAULT true)`);
  db.run(`ALTER TABLE users ADD COLUMN isEnabled BOOLEAN DEFAULT true`, () => {});
  
  db.run(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, username TEXT, itemName TEXT, price INTEGER, timestamp INTEGER, status TEXT DEFAULT 'pending')`);
  db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category TEXT, name TEXT, price INTEGER, imageBase64 TEXT, inStock BOOLEAN DEFAULT true, requiredTier TEXT DEFAULT 'none')`);
  db.run(`CREATE TABLE IF NOT EXISTS news (id TEXT PRIMARY KEY, title TEXT, content TEXT, timestamp INTEGER)`);
  
  // --- NEW: TOP PICKS TABLE ---
  db.run(`CREATE TABLE IF NOT EXISTS top_picks (name TEXT PRIMARY KEY)`);
  
  db.run(`INSERT OR IGNORE INTO users (username, name, password, isAdmin, isEnabled) VALUES ('admin', 'System Admin', '123', true, true)`);
});

function broadcastInventory() {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return;
    const inventory = { foods: {}, drinks: {}, battlepass: {}, ecoin: {} };
    rows.forEach(row => {
      if (!inventory[row.category]) inventory[row.category] = {};
      inventory[row.category][row.id] = {
        id: row.id, name: row.name, price: row.price, file: row.imageBase64, 
        inStock: row.inStock === 1 || String(row.inStock) === 'true', requiredTier: row.requiredTier
      };
    });
    io.emit('sync_inventory', inventory);
  });
}

function broadcastLeaderboard() {
  db.all("SELECT username, xp FROM users WHERE isAdmin = 0 ORDER BY xp DESC LIMIT 3", [], (err, rows) => {
    if (!err) io.emit('sync_leaderboard', rows);
  });
}

function broadcastNews() {
  db.all("SELECT * FROM news ORDER BY timestamp DESC", [], (err, rows) => {
    if (!err) io.emit('sync_news', rows);
  });
}

function broadcastAllUsers() {
  db.all(`SELECT username, name, xp, lifetimeXp, isOnline, isAdmin, isEnabled FROM users`, [], (err, rows) => {
    if (!err) io.emit('sync_all_users', rows);
  });
}

// --- NEW: BROADCAST TOP PICKS ---
function broadcastTopPicks() {
  db.all("SELECT name FROM top_picks", [], (err, rows) => {
    if (!err) io.emit('sync_top_picks', rows.map(r => r.name));
  });
}

let systemConfig = { silverXp: 2000, goldXp: 5000, xpPerHour: 1800, boostMultiplier: 2, enableMidnightBoost: false };

io.on('connection', (socket) => {
  socket.on('request_initial_data', () => {
    broadcastInventory();
    broadcastNews();
    broadcastTopPicks();
    socket.emit('sync_config', systemConfig);
  });

  socket.on('request_leaderboard', () => broadcastLeaderboard());

  socket.on('login', ({ username, password }) => {
    const safeUsername = username.trim().toLowerCase();
    db.get(`SELECT * FROM users WHERE username = ?`, [safeUsername], (err, row) => {
      if (err) return socket.emit('login_error', 'Database error');
      if (row && row.password === password) {
        const isEnabled = row.isEnabled === 1 || String(row.isEnabled) === 'true' || row.isEnabled === null;
        if (!row.isAdmin && !isEnabled) {
          return socket.emit('login_error', 'Your account has been disabled by an administrator.');
        }
        db.run(`UPDATE users SET isOnline = true WHERE username = ?`, [safeUsername]);
        socket.emit('login_success', row);
        broadcastAllUsers();
      } else {
        socket.emit('login_error', 'Incorrect username or password');
      }
    });
  });

  socket.on('register', ({ username, name, password }) => {
    const safeUsername = username.trim().toLowerCase();
    db.run(`INSERT INTO users (username, name, password, isEnabled) VALUES (?, ?, ?, true)`, 
      [safeUsername, name, password], function(err) {
        if (err) return socket.emit('login_error', 'Username already exists!');
        socket.emit('login_success', { username: safeUsername, name, xp: 0, lifetimeXp: 0, isAdmin: false, isEnabled: true });
        broadcastAllUsers();
    });
  });

  socket.on('logout', (username) => {
    if(username) {
       db.run(`UPDATE users SET isOnline = false WHERE username = ?`, [username]);
       broadcastAllUsers();
    }
  });

  socket.on('update_password', ({ username, currentPassword, newPassword }) => {
    const safeUsername = username.trim().toLowerCase();
    db.get(`SELECT password FROM users WHERE username = ?`, [safeUsername], (err, row) => {
      if (err || !row) return socket.emit('password_update_error', 'User not found.');
      if (row.password !== currentPassword) return socket.emit('password_update_error', 'Incorrect current password.');
      db.run(`UPDATE users SET password = ? WHERE username = ?`, [newPassword, safeUsername], function(err) {
        if (err) return socket.emit('password_update_error', 'Database error.');
        socket.emit('password_update_success', 'Password updated successfully!');
      });
    });
  });

  socket.on('reset_forgot_password', ({ username, name, newPassword }) => {
    const safeUsername = username.trim().toLowerCase();
    const safeName = name.trim().toLowerCase();

    db.get(`SELECT name FROM users WHERE username = ?`, [safeUsername], (err, row) => {
      if (err || !row) return socket.emit('login_error', 'User account not found.');
      if (row.name.toLowerCase() !== safeName) {
        return socket.emit('login_error', 'Verification failed. The Full Name does not match our records for this username.');
      }
      db.run(`UPDATE users SET password = ? WHERE username = ?`, [newPassword, safeUsername], function(err) {
        if (err) return socket.emit('login_error', 'Database error while saving new password.');
        socket.emit('password_reset_success', 'Password reset successfully! You can now log in with default password.');
        writeAdminLog(`User @${safeUsername} executed a self-service password reset.`);
      });
    });
  });

  socket.on('claim_xp', ({ username, amount }) => {
    const safeAmount = Math.min(Math.max(0, amount), 10000); 
    db.run(`UPDATE users SET xp = xp + ?, lifetimeXp = lifetimeXp + ? WHERE username = ?`, 
      [safeAmount, safeAmount, username], function(err) {
        if (!err) {
          db.get(`SELECT xp, lifetimeXp FROM users WHERE username = ?`, [username], (err, row) => {
            if (row) socket.emit('xp_updated', { xp: row.xp, lifetimeXp: row.lifetimeXp });
          });
          broadcastLeaderboard();
          broadcastAllUsers();
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
          db.run(`INSERT INTO orders (id, username, itemName, price, timestamp) VALUES (?, ?, ?, ?, ?)`,
            [orderId, username, item.item, item.price, timestamp]);
          io.emit('new_live_order', { username, item: item.item, timestamp });
        });
        socket.emit('xp_updated', { xp: user.xp - cartTotal });
        socket.emit('order_success', 'Order placed successfully!');
        broadcastAllUsers();
      });
    });
  });

  socket.on('request_user_history', (username) => {
    db.all(`SELECT * FROM orders WHERE username = ? ORDER BY timestamp DESC`, [username], (err, rows) => {
      if (!err) socket.emit('sync_user_history', rows);
    });
  });

  socket.on('request_all_orders', () => {
    db.all(`SELECT * FROM orders ORDER BY timestamp DESC`, [], (err, rows) => {
      if (!err) socket.emit('sync_all_orders', rows);
    });
  });

  socket.on('update_order_status', ({ id, status }) => {
    db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], () => {
      writeAdminLog(`Processed order ${id} - Status: ${status}`);
      db.all(`SELECT * FROM orders ORDER BY timestamp DESC`, [], (err, rows) => {
        if (!err) io.emit('sync_all_orders', rows);
      });
    });
  });

  socket.on('request_all_users', () => {
    broadcastAllUsers();
  });

  socket.on('admin_update_user', ({ username, name, password, isEnabled }) => {
    const enabledVal = isEnabled ? 1 : 0;
    if (password && password.trim() !== '') {
      db.run(`UPDATE users SET name = ?, password = ?, isEnabled = ? WHERE username = ?`, [name, password, enabledVal, username], () => {
        writeAdminLog(`Updated user profile, password, and status for @${username}`);
        broadcastAllUsers();
      });
    } else {
      db.run(`UPDATE users SET name = ?, isEnabled = ? WHERE username = ?`, [name, enabledVal, username], () => {
        writeAdminLog(`Updated user profile name and status for @${username}`);
        broadcastAllUsers();
      });
    }
  });

  socket.on('admin_toggle_user_status', ({ username, currentStatus }) => {
    db.run(`UPDATE users SET isEnabled = ? WHERE username = ?`, [currentStatus ? 1 : 0, username], () => {
      writeAdminLog(`${currentStatus ? 'Enabled' : 'Disabled'} account access for @${username}`);
      broadcastAllUsers();
    });
  });

  socket.on('admin_delete_user', (username) => {
    db.run(`DELETE FROM users WHERE username = ?`, [username], () => {
      writeAdminLog(`Permanently deleted user account @${username}`);
      broadcastAllUsers();
    });
  });

  socket.on('admin_save_product', ({ category, targetId, productData }) => {
    db.run(`INSERT OR REPLACE INTO products (id, category, name, price, imageBase64, inStock, requiredTier) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [targetId, category, productData.name, productData.price, productData.file, productData.inStock ? 1 : 0, productData.requiredTier],
      () => {
        writeAdminLog(`Saved/Updated product: ${productData.name} in ${category}`);
        broadcastInventory();
      });
  });

  socket.on('admin_delete_product', ({ category, targetId }) => {
    db.run(`DELETE FROM products WHERE id = ?`, [targetId], () => {
      writeAdminLog(`Deleted product ID: ${targetId} from ${category}`);
      broadcastInventory();
    });
  });

  socket.on('admin_toggle_stock', ({ category, targetId, currentStock }) => {
    db.run(`UPDATE products SET inStock = ? WHERE id = ?`, [currentStock ? 1 : 0, targetId], () => {
      writeAdminLog(`Toggled stock status for product ID: ${targetId} to ${currentStock ? 'In Stock' : 'Out of Stock'}`);
      broadcastInventory();
    });
  });

  // --- NEW: TOGGLE TOP PICK ---
  socket.on('admin_toggle_top_pick', ({ name, isTopPick }) => {
    if (isTopPick) {
      db.run(`DELETE FROM top_picks WHERE name = ?`, [name], () => {
        writeAdminLog(`Removed ${name} from Top Picks`);
        broadcastTopPicks();
      });
    } else {
      db.run(`INSERT OR IGNORE INTO top_picks (name) VALUES (?)`, [name], () => {
        writeAdminLog(`Added ${name} to Top Picks`);
        broadcastTopPicks();
      });
    }
  });

  socket.on('admin_save_news', ({ title, content }) => {
    const id = `news_${Date.now()}`;
    db.run(`INSERT INTO news (id, title, content, timestamp) VALUES (?, ?, ?, ?)`, [id, title, content, Date.now()], () => {
      writeAdminLog(`Posted new announcement: "${title}"`);
      broadcastNews();
    });
  });

  socket.on('admin_delete_news', (id) => {
    db.run(`DELETE FROM news WHERE id = ?`, [id], () => {
      writeAdminLog(`Deleted announcement ID: ${id}`);
      broadcastNews();
    });
  });

  socket.on('update_config', (newConfig) => {
    systemConfig = newConfig;
    writeAdminLog(`Updated Global System Configuration parameters`);
    io.emit('sync_config', systemConfig);
  });

  socket.on('request_admin_logs', () => {
    fs.readFile(iniPath, 'utf8', (err, data) => {
      if (err) return socket.emit('sync_admin_logs', []);
      const lines = data.trim().split('\n');
      const logs = lines.map(line => {
        if(line.includes('=')) {
          const parts = line.split('=');
          return { 
            timestamp: new Date(parts[0]).toLocaleString(), 
            action: parts.slice(1).join('=').replace(/^"|"$/g, '') 
          };
        }
        return null;
      }).filter(Boolean);
      socket.emit('sync_admin_logs', logs.reverse());
    });
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🟢 Local Server running on port ${PORT}`);
});

