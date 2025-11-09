const { app, BrowserWindow } = require('electron');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#000011',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: true,
    titleBarStyle: 'default'
  });

  win.loadFile('index.html');
  
  // Handle external links - open in default browser
  win.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    require('electron').shell.openExternal(url);
  });
  
  // Also handle will-navigate for same-window navigation to external URLs
  win.webContents.on('will-navigate', function(e, url) {
    // Only prevent navigation if it's an external URL (not a local file)
    if (!url.startsWith('file://') && url !== win.webContents.getURL()) {
      e.preventDefault();
      require('electron').shell.openExternal(url);
    }
  });
  
  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});