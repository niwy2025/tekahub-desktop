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
  type Client,
  type CreateSalePayload,
  type PrinterInfo,
  type PrinterSettings,
  type Product,
  type ProductListQuery,
  type Sale,
  type SaleClientCheckPayload,
  type SaleClientCheckResponse,
  type SaleHistoryQuery,
  type SaleHistoryResponse,
  type SaleReceiptPayload,
  type SessionInfo,
  type ShellUpdateState,
} from "@teka/shared";
import { fetchMe, getSessionInfo, login, logout, restoreSession } from "./auth";
import { ApiError, setUnauthorizedHandler } from "./api-client";
import { listProducts } from "./catalog";
import { listAllClients } from "./clients";
import { printSaleReceipt } from "./print-receipt";
import { getPrinterSettings, setPrinterSettings } from "./printer-settings";
import { checkSaleClient, createSale, getSaleDetail, listSaleHistory } from "./sales";
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
  setUnauthorizedHandler(() => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IpcChannels.onSessionExpired);
    }
  });

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

  ipcMain.handle(IpcChannels.listClients, async (): Promise<Client[]> => {
    try {
      return await listAllClients();
    } catch (err) {
      throw toIpcError(err);
    }
  });

  ipcMain.handle(
    IpcChannels.checkSaleClient,
    async (_e, payload: SaleClientCheckPayload): Promise<SaleClientCheckResponse> => {
      try {
        return await checkSaleClient(payload);
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.createSale,
    async (_e, payload: CreateSalePayload): Promise<Sale> => {
      try {
        return await createSale(payload);
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.listSaleHistory,
    async (_e, query?: SaleHistoryQuery): Promise<SaleHistoryResponse> => {
      try {
        return await listSaleHistory(query ?? {});
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.getSaleDetail,
    async (_e, saleId: string): Promise<Sale> => {
      try {
        return await getSaleDetail(saleId);
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(IpcChannels.getPrinterSettings, (): PrinterSettings => getPrinterSettings());

  ipcMain.handle(
    IpcChannels.setPrinterSettings,
    (_e, patch: Partial<PrinterSettings>): PrinterSettings => setPrinterSettings(patch ?? {}),
  );

  ipcMain.handle(
    IpcChannels.listPrinters,
    async (event): Promise<PrinterInfo[]> => {
      try {
        const wc = event.sender;
        const printers = await wc.getPrintersAsync();
        return printers.map((p) => ({
          name: p.name,
          displayName: p.displayName || p.name,
          description: p.description,
          isDefault: Boolean(p.isDefault),
        }));
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.printSaleReceipt,
    async (_e, payload: SaleReceiptPayload): Promise<{ ok: boolean; error?: string }> => {
      try {
        return await printSaleReceipt(payload);
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );
}
