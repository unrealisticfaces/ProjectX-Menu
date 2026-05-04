const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuitting = false;

// ==========================================
// --- DISKLESS CAFE OPTIMIZATIONS ---
// ==========================================
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=250');
app.commandLine.appendSwitch('enable-smooth-scrolling');
app.commandLine.appendSwitch('disable-background-networking');

// ==========================================
// --- SINGLE INSTANCE LOCK ---
// ==========================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
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
        nodeIntegration: true,     
        contextIsolation: false,   
        devTools: false,           // 🔒 FLASHLIGHT OFF FOR PRODUCTION
        spellcheck: false,         
        backgroundThrottling: false,
        webSecurity: false         
      }
    });

    Menu.setApplicationMenu(null);

    // 🔒 ANTI-HACKER SECURITY: Block F12 and Ctrl+Shift+I so players can't open DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
      const isDevToolsShortcut = 
        (input.key === 'F12') || 
        (input.control && input.shift && input.key.toLowerCase() === 'i') ||
        (input.control && input.shift && input.key.toLowerCase() === 'j');

      if (isDevToolsShortcut) event.preventDefault(); 
    });

    if (app.isPackaged) {
      // THE FIX: Using loadFile for local Windows environments
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
      // Removed the openDevTools() command!
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
      { label: 'Open 4G Gamers Hub', click: function () { mainWindow.show(); } },
      { label: 'Exit App', click: function () { isQuitting = true; app.quit(); } }
    ]);

    tray.setToolTip('4G GAMING');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow.show();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}