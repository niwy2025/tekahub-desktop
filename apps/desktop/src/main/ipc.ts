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
  type ClientWritePayload,
  type CancelSalePayload,
  type CreateSalePayload,
  type RecordSalePaymentPayload,
  type ConnectionSettings,
  type ConnectionSettingsView,
  type DailyReport,
  type DailyReportQuery,
  type EnterpriseExchangeRatesResponse,
  type FlushOfflineQueueResult,
  type OfflineQueueState,
  type PrinterInfo,
  type PrinterSettings,
  type Product,
  type ProductListQuery,
  type SellableProductQuery,
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
import { listProducts, listSellableProducts } from "./catalog";
import { createClient, listAllClients, updateClient } from "./clients";
import { getDailyReport } from "./daily-report";
import { getEnterpriseExchangeRates } from "./exchange-rates";
import {
  flushOfflineQueue,
  getOfflineQueueState,
  setOfflineQueueChangeHandler,
} from "./offline-queue";
import { printSaleReceipt } from "./print-receipt";
import { getPrinterSettings, setPrinterSettings } from "./printer-settings";
import {
  DEFAULT_API_BASE_URL,
  getConnectionSettings,
  setConnectionSettings,
} from "./connection-settings";
import {
  cancelSale,
  checkSaleClient,
  createSale,
  getSaleDetail,
  listSaleHistory,
  recordSalePayment,
} from "./sales";
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

  setOfflineQueueChangeHandler((state) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IpcChannels.onOfflineQueueChanged, state);
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

  ipcMain.handle(
    IpcChannels.listSellableProducts,
    async (_e, query?: SellableProductQuery): Promise<Product[]> => {
      try {
        return await listSellableProducts(query ?? {});
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
    IpcChannels.createClient,
    async (_e, payload: ClientWritePayload): Promise<Client> => {
      try {
        return await createClient(payload);
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.updateClient,
    async (
      _e,
      payload: { clientId: string; patch: Partial<ClientWritePayload> & { actif?: boolean } },
    ): Promise<Client> => {
      try {
        return await updateClient(payload.clientId, payload.patch ?? {});
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

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
    IpcChannels.cancelSale,
    async (_e, payload: CancelSalePayload): Promise<Sale> => {
      try {
        return await cancelSale(payload);
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.recordSalePayment,
    async (_e, payload: RecordSalePaymentPayload): Promise<Sale> => {
      try {
        return await recordSalePayment(payload);
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

  ipcMain.handle(IpcChannels.getConnectionSettings, (): ConnectionSettingsView => {
    const saved = getConnectionSettings();
    const fromEnv = Boolean(process.env.API_BASE_URL?.trim());
    return {
      ...saved,
      effectiveApiBaseUrl: appConfig.apiBaseUrl,
      defaultApiBaseUrl: DEFAULT_API_BASE_URL,
      fromEnv,
    };
  });

  ipcMain.handle(
    IpcChannels.setConnectionSettings,
    (_e, patch: Partial<ConnectionSettings>): ConnectionSettingsView => {
      try {
        setConnectionSettings(patch ?? {});
        const saved = getConnectionSettings();
        const fromEnv = Boolean(process.env.API_BASE_URL?.trim());
        return {
          ...saved,
          effectiveApiBaseUrl: appConfig.apiBaseUrl,
          defaultApiBaseUrl: DEFAULT_API_BASE_URL,
          fromEnv,
        };
      } catch (err) {
        throw toIpcError(err);
      }
    },
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

  ipcMain.handle(IpcChannels.getOfflineQueueState, (): OfflineQueueState => getOfflineQueueState());

  ipcMain.handle(
    IpcChannels.flushOfflineQueue,
    async (): Promise<FlushOfflineQueueResult> => {
      try {
        return await flushOfflineQueue();
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.getDailyReport,
    async (_e, query?: DailyReportQuery): Promise<DailyReport> => {
      try {
        return await getDailyReport(query ?? {});
      } catch (err) {
        throw toIpcError(err);
      }
    },
  );

  ipcMain.handle(
    IpcChannels.getEnterpriseExchangeRates,
    async (): Promise<EnterpriseExchangeRatesResponse> => {
      try {
        return await getEnterpriseExchangeRates();
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
