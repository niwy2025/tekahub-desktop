import { app, BrowserWindow, shell } from "electron";
import { join } from "node:path";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

import { applyContentSecurityPolicy } from "./security";
import { registerIpc } from "./ipc";
import { configureAutoUpdater, checkShellUpdates } from "./updater";
import { checkAndUpdatePack } from "./pack-manager";
import { getAppPaths } from "./paths";
import { appConfig } from "./config";

// Linux : GetVSyncParametersIfAvailable pollue le terminal — désactiver le GPU
// sauf si TEKA_ENABLE_GPU=1. Sur les autres OS, TEKA_DISABLE_GPU=1 force le soft render.
app.commandLine.appendSwitch("log-level", "3");
app.commandLine.appendSwitch("disable-gpu-vsync");
const disableGpu =
  process.env.TEKA_DISABLE_GPU === "1" ||
  (process.platform === "linux" && process.env.TEKA_ENABLE_GPU !== "1");
if (disableGpu) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("disable-software-rasterizer");
}

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
    backgroundColor: "#fbfbf8",
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
    void shell.openExternal(url);
    return { action: "deny" };
  });

  // DevTools on demand only (avoids Autofill.* console noise)
  if (!app.isPackaged && process.env.TEKA_OPEN_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  applyContentSecurityPolicy();
  getAppPaths();
  configureAutoUpdater(getWindow);
  registerIpc(getWindow);
  createWindow();

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
