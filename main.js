const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuitting = false;

// ==========================================
// --- SINGLE INSTANCE LOCK ---
// ==========================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
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
      useContentSize: true, /* ✨ FIX: Forces the CSS/HTML to be exactly 1280x768 */
      resizable: false, 
      autoHideMenuBar: true, 
      icon: iconPath, 
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    if (app.isPackaged) {
      mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }

    // Intercept the close "X" button
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
      { 
        label: 'Open 4G GAMERS', 
        click: function () { 
          mainWindow.show(); 
        } 
      },
      { 
        label: 'Exit App', 
        click: function () { 
          isQuitting = true; 
          app.quit(); 
        } 
      }
    ]);

    tray.setToolTip('4G GAMERS Rewards');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow.show();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}