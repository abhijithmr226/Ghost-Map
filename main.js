const { app, BrowserWindow } = require('electron');
const path = require('path');

// Start Express backend server inside the Electron main process
try {
  require('./server/server.js');
} catch (err) {
  console.error("Failed to start backend server inside Electron:", err);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "GhostMap - Cybersecurity Recon Dashboard",
    backgroundColor: "#07111f",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  // Remove native default menu bar for custom dark theme hud styling
  win.setMenuBarVisibility(false);

  // Determine starting URL
  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev ? 'http://localhost:5173' : 'http://localhost:5000';

  // Load target page
  win.loadURL(startUrl);

  // Open devtools in development mode
  if (isDev) {
    win.webContents.openDevTools();
  }

  // Graceful show
  win.on('page-title-updated', (e) => e.preventDefault());
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
