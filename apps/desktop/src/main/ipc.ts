import { app, BrowserWindow, ipcMain } from "electron";
import {
  IpcChannels,
  type AppInfo,
  type AppLocale,
  type AuthLoginResult,
  type AuthUser,
  type LocaleInfo,
  type PackLocalState,
  type PackUpdateState,
  type Product,
  type ProductListQuery,
  type SessionInfo,
  type ShellUpdateState,
} from "@teka/shared";
import { fetchMe, getSessionInfo, login, logout, restoreSession } from "./auth";
import { ApiError } from "./api-client";
import { listProducts } from "./catalog";
import { appConfig } from "./config";
import { getAppLocale, getDeviceLocale, setAppLocale } from "./locale";
import { getAppPaths } from "./paths";
import {
  checkAndUpdatePack,
  getPacksState,
  rollbackPack,
} from "./pack-manager";
import {
  checkShellUpdates,
  getShellUpdateState,
  quitAndInstallShellUpdate,
} from "./updater";

function toIpcError(err: unknown): Error {
  if (err instanceof ApiError) {
    return new Error(err.message);
  }
  if (err instanceof Error) return err;
  return new Error(String(err));
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IpcChannels.getAppInfo, (): AppInfo => ({
    name: appConfig.productName,
    version: app.getVersion(),
    platform: process.platform,
    userDataPath: getAppPaths().root,
    isPackaged: app.isPackaged,
    apiConfigured: Boolean(appConfig.apiBaseUrl),
    apiBaseUrl: appConfig.apiBaseUrl || null,
    locale: getAppLocale(),
    deviceLocale: getDeviceLocale(),
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

  ipcMain.handle(IpcChannels.getSession, async (): Promise<{
    session: SessionInfo;
    user: AuthUser | null;
    locale: LocaleInfo;
  }> => {
    const session = getSessionInfo();
    const locale = { locale: getAppLocale(), deviceLocale: getDeviceLocale() };
    if (!session.authenticated) {
      return { session, user: null, locale };
    }
    const user = await restoreSession();
    return { session: getSessionInfo(), user, locale };
  });

  ipcMain.handle(
    IpcChannels.login,
    async (
      _e,
      payload: { login: string; password: string; userId?: string },
    ): Promise<AuthLoginResult> => {
      try {
        return await login(payload.login, payload.password, payload.userId);
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(IpcChannels.logout, async (): Promise<void> => {
    await logout();
  });

  ipcMain.handle(IpcChannels.getMe, async (): Promise<AuthUser> => {
    try {
      return await fetchMe();
    } catch (err) {
      throw toIpcError(err);
    }
  });

  ipcMain.handle(IpcChannels.getLocale, (): LocaleInfo => ({
    locale: getAppLocale(),
    deviceLocale: getDeviceLocale(),
  }));

  ipcMain.handle(IpcChannels.setLocale, (_e, locale: AppLocale): LocaleInfo => ({
    locale: setAppLocale(locale),
    deviceLocale: getDeviceLocale(),
  }));

  ipcMain.handle(
    IpcChannels.listProducts,
    async (_e, query?: ProductListQuery): Promise<Product[]> => {
      try {
        return await listProducts(query ?? {});
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );
}
