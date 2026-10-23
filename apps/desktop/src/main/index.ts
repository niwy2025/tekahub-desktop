import { app, BrowserWindow, Menu, nativeImage, nativeTheme, shell } from "electron";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

import { applyContentSecurityPolicy } from "./security";
import { registerIpc } from "./ipc";
import { configureAutoUpdater, checkShellUpdates } from "./updater";
import { checkAndUpdatePack } from "./pack-manager";
import { getAppPaths } from "./paths";
import { appConfig } from "./config";

/** Fond clair de l’UI — la barre de titre Windows suit le thème système sinon. */
const APP_BG = "#fbfbf8";
const APP_INK = "#1a1a1a";

// Aligner chrome natif (title bar) sur le thème clair TekaHub, même si Windows est en dark mode.
nativeTheme.themeSource = "light";

/** Icône fenêtre / dock — build/resources selon packagé ou dev. */
function resolveAppIconPath(): string | null {
  const candidates = [
    join(process.resourcesPath, "resources", "icon.png"),
    join(process.resourcesPath, "icon.png"),
    join(__dirname, "../../resources/icon.png"),
    join(__dirname, "../../build/icon.png"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

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
  const iconPath = resolveAppIconPath();
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    title: "TekaHub",
    backgroundColor: APP_BG,
    show: false,
    autoHideMenuBar: true,
    ...(icon && !icon.isEmpty() ? { icon } : {}),
    // Windows : barre de titre claire intégrée (couleurs app), boutons min/max/close natifs.
    ...(process.platform === "win32"
      ? {
          titleBarStyle: "hidden",
          titleBarOverlay: {
            color: APP_BG,
            symbolColor: APP_INK,
            height: 36,
          },
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (process.platform === "darwin" && icon && !icon.isEmpty() && app.dock) {
    app.dock.setIcon(icon);
  }

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
  // Caisse POS : pas de barre Fichier/Édition/Affichage (menu Electron par défaut).
  Menu.setApplicationMenu(null);

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
