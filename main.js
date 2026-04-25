const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuitting = false;

// ==========================================
// --- DISKLESS CAFE OPTIMIZATIONS ---
// ==========================================
// 1. Limit the Javascript engine's RAM usage to ~250MB so it never lags games
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=250');

// 2. Enable Chromium's native, lag-free smooth scrolling engine
app.commandLine.appendSwitch('enable-smooth-scrolling');

// 3. Disable background networking features that aren't needed
app.commandLine.appendSwitch('disable-background-networking');


// ==========================================
// --- SINGLE INSTANCE LOCK ---
// ==========================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // ==========================================
  // --- APP INITIALIZATION ---
  // ==========================================
  function createWindow() {
    const iconPath = app.isPackaged 
      ? path.join(__dirname, 'dist/images/logo/logo2.png') 
      : path.join(__dirname, 'public/images/logo/logo2.png');

    mainWindow = new BrowserWindow({
      width: 1280, 
      height: 768, 
      useContentSize: true, 
      resizable: false, 
      autoHideMenuBar: true, 
      icon: iconPath, 
      webPreferences: {
        nodeIntegration: false,    // 🛡️ SECURITY MUST BE FALSE
        contextIsolation: true,    // 🛡️ SECURITY MUST BE TRUE
        devTools: false,           // 🛡️ SECURITY
        spellcheck: false,         // ⚡ PERFORMANCE: Saves ~40MB RAM
        backgroundThrottling: false // ⚡ PERFORMANCE: Keeps XP timer running when hidden
      }
    });

    Menu.setApplicationMenu(null);

    // Block developer shortcuts
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const isDevToolsShortcut = 
        (input.key === 'F12') || 
        (input.control && input.shift && input.key.toLowerCase() === 'i') ||
        (input.control && input.shift && input.key.toLowerCase() === 'j');

      if (isDevToolsShortcut) event.preventDefault(); 
    });

    if (app.isPackaged) {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }

    mainWindow.on('close', function (event) {
      if (!isQuitting) {
        event.preventDefault(); 
        mainWindow.hide();      
      }
      return false;
    });
  }

  app.whenReady().then(() => {
    createWindow();

    const iconPath = app.isPackaged 
      ? path.join(__dirname, 'dist/images/logo/logo2.png') 
      : path.join(__dirname, 'public/images/logo/logo2.png');
      
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open 4G GAMERS', click: function () { mainWindow.show(); } },
      { label: 'Exit App', click: function () { isQuitting = true; app.quit(); } }
    ]);

    tray.setToolTip('4G GAMERS Rewards');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow.show();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}