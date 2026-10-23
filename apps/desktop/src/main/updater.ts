import { autoUpdater, type UpdateInfo } from "electron-updater";
import { app, BrowserWindow } from "electron";
import type { ShellUpdateState } from "@teka/shared";
import { IpcChannels } from "@teka/shared";
import { appConfig } from "./config";

let state: ShellUpdateState = {
  status: "idle",
  currentVersion: app.getVersion(),
};

function emit(win: BrowserWindow | null) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(IpcChannels.onShellUpdate, state);
  }
}

function setState(win: BrowserWindow | null, patch: Partial<ShellUpdateState>) {
  state = { ...state, ...patch, currentVersion: app.getVersion() };
  emit(win);
}

export function getShellUpdateState(): ShellUpdateState {
  return state;
}

export function configureAutoUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  if (appConfig.updateProvider === "generic" && appConfig.updateUrl) {
    autoUpdater.setFeedURL({
      provider: "generic",
      url: appConfig.updateUrl,
    });
  } else {
    // github provider uses publish config from package.json / electron-builder
    autoUpdater.setFeedURL({
      provider: "github",
      owner: appConfig.ghOwner,
      repo: appConfig.ghRepo,
    });
  }

  autoUpdater.on("checking-for-update", () => {
    setState(getWindow(), { status: "checking", message: "Vérification des mises à jour…" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    setState(getWindow(), {
      status: "downloading",
      availableVersion: info.version,
      message: "Téléchargement…",
      progress: 0,
    });
  });

  autoUpdater.on("update-not-available", () => {
    setState(getWindow(), {
      status: "up-to-date",
      message: "À jour",
      availableVersion: undefined,
      progress: undefined,
    });
  });

  autoUpdater.on("download-progress", (p) => {
    setState(getWindow(), {
      status: "downloading",
      progress: Math.round(p.percent),
      message: "Téléchargement…",
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    setState(getWindow(), {
      status: "ready",
      availableVersion: info.version,
      progress: 100,
      message: "Redémarrer pour appliquer",
    });
  });

  autoUpdater.on("error", (err) => {
    // In unpackaged / local dev, updater errors are expected — stay quiet-ish
    const raw = err?.message ?? String(err);
    const msg = explainUpdaterError(raw);
    setState(getWindow(), {
      status: app.isPackaged ? "error" : "up-to-date",
      error: raw,
      message: app.isPackaged ? msg : "À jour (dev)",
    });
  });
}

function explainUpdaterError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("404") || lower.includes("not found")) {
    return "Mise à jour inaccessible (dépôt privé ou release manquante)";
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("bad credentials")) {
    return "Accès GitHub refusé — le dépôt des releases doit être public";
  }
  return "Erreur de mise à jour";
}

export async function checkShellUpdates(): Promise<ShellUpdateState> {
  if (appConfig.skipUpdateCheck || !app.isPackaged) {
    state = {
      status: "up-to-date",
      currentVersion: app.getVersion(),
      message: app.isPackaged ? "À jour" : "À jour (dev — updater désactivé)",
    };
    return state;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    state = {
      ...state,
      status: "error",
      error: raw,
      message: explainUpdaterError(raw),
    };
  }
  return state;
}

export function quitAndInstallShellUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
