import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { applyContentSecurityPolicy } from "./security";
import { registerIpc } from "./ipc";
import { configureAutoUpdater, checkShellUpdates } from "./updater";
import { checkAndUpdatePack } from "./pack-manager";
import { getAppPaths } from "./paths";
import { appConfig } from "./config";

// Ensure userData folder is named TekaHub (not @teka/desktop)
app.setName("TekaHub");
app.setPath("userData", join(app.getPath("appData"), "TekaHub"));

let mainWindow: BrowserWindow | null = null;

function getWindow() {
  return mainWindow;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: "TekaHub",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  applyContentSecurityPolicy();
  getAppPaths(); // ensure dirs exist
  configureAutoUpdater(getWindow);
  registerIpc(getWindow);
  createWindow();

  // Background: shell + pack updates (non-blocking)
  void checkShellUpdates().then(() => {
    void checkAndUpdatePack(appConfig.corePackId, getWindow);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
