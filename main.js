const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 292,
    height: 430,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");

  // inspect
  win.webContents.openDevTools({ mode: "detach" });
}

app.whenReady().then(createWindow);

// IPC: fermer la fenêtre
ipcMain.on("app:close", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
