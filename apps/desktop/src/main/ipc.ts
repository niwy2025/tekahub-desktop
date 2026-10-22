import { app, BrowserWindow, ipcMain } from "electron";
import {
  IpcChannels,
  type AppInfo,
  type PackLocalState,
  type PackUpdateState,
  type ShellUpdateState,
} from "@teka/shared";
import { appConfig } from "./config";
import { getAppPaths } from "./paths";
import {
  checkShellUpdates,
  getShellUpdateState,
  quitAndInstallShellUpdate,
} from "./updater";
import {
  checkAndUpdatePack,
  getPacksState,
  rollbackPack,
} from "./pack-manager";

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IpcChannels.getAppInfo, (): AppInfo => ({
    name: appConfig.productName,
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: getAppPaths().root,
    isPackaged: app.isPackaged,
  }));

  ipcMain.handle(IpcChannels.getUpdateState, (): ShellUpdateState => getShellUpdateState());

  ipcMain.handle(IpcChannels.checkUpdates, async (): Promise<{
    shell: ShellUpdateState;
    packs: PackUpdateState[];
  }> => {
    const shell = await checkShellUpdates();
    await checkAndUpdatePack(appConfig.corePackId, getWindow);
    return { shell, packs: getPacksState() };
  });

  ipcMain.handle(IpcChannels.installShellUpdate, (): void => {
    quitAndInstallShellUpdate();
  });

  ipcMain.handle(IpcChannels.getPacksState, (): PackUpdateState[] => getPacksState());

  ipcMain.handle(
    IpcChannels.applyPackUpdate,
    async (_e, packId: string): Promise<PackLocalState | null> => {
      return checkAndUpdatePack(packId || appConfig.corePackId, getWindow);
    },
  );

  ipcMain.handle(
    IpcChannels.rollbackPack,
    (_e, packId: string): PackLocalState | null => {
      return rollbackPack(packId || appConfig.corePackId);
    },
  );
}
