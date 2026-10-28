import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
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
  type DailyReport,
  type DailyReportQuery,
  type FlushOfflineQueueResult,
  type OfflineQueueState,
} from "@teka/shared";

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IpcChannels.getAppInfo),
  getUpdateState: (): Promise<ShellUpdateState> =>
    ipcRenderer.invoke(IpcChannels.getUpdateState),
  checkUpdates: (): Promise<{ shell: ShellUpdateState; packs: PackUpdateState[] }> =>
    ipcRenderer.invoke(IpcChannels.checkUpdates),
  installShellUpdate: (): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.installShellUpdate),
  getPacksState: (): Promise<PackUpdateState[]> =>
    ipcRenderer.invoke(IpcChannels.getPacksState),
  applyPackUpdate: (packId?: string): Promise<PackLocalState | null> =>
    ipcRenderer.invoke(IpcChannels.applyPackUpdate, packId),
  rollbackPack: (packId?: string): Promise<PackLocalState | null> =>
    ipcRenderer.invoke(IpcChannels.rollbackPack, packId),
  onShellUpdate: (cb: (state: ShellUpdateState) => void): (() => void) => {
    const listener = (_: IpcRendererEvent, state: ShellUpdateState) => cb(state);
    ipcRenderer.on(IpcChannels.onShellUpdate, listener);
    return () => ipcRenderer.removeListener(IpcChannels.onShellUpdate, listener);
  },
  onPackUpdate: (cb: (state: PackUpdateState) => void): (() => void) => {
    const listener = (_: IpcRendererEvent, state: PackUpdateState) => cb(state);
    ipcRenderer.on(IpcChannels.onPackUpdate, listener);
    return () => ipcRenderer.removeListener(IpcChannels.onPackUpdate, listener);
  },
  getSession: (): Promise<{
    session: SessionInfo;
    user: AuthUser | null;
    locale: LocaleInfo;
  }> => ipcRenderer.invoke(IpcChannels.getSession),
  login: (login: string, password: string, userId?: string): Promise<AuthLoginResult> =>
    ipcRenderer.invoke(IpcChannels.login, { login, password, userId }),
  logout: (): Promise<void> => ipcRenderer.invoke(IpcChannels.logout),
  getMe: (): Promise<AuthUser> => ipcRenderer.invoke(IpcChannels.getMe),
  getLocale: (): Promise<LocaleInfo> => ipcRenderer.invoke(IpcChannels.getLocale),
  setLocale: (locale: AppLocale): Promise<LocaleInfo> =>
    ipcRenderer.invoke(IpcChannels.setLocale, locale),
  listProducts: (query?: ProductListQuery): Promise<Product[]> =>
    ipcRenderer.invoke(IpcChannels.listProducts, query),
  listSellableProducts: (query?: SellableProductQuery): Promise<Product[]> =>
    ipcRenderer.invoke(IpcChannels.listSellableProducts, query),
  listClients: (): Promise<Client[]> => ipcRenderer.invoke(IpcChannels.listClients),
  createClient: (payload: ClientWritePayload): Promise<Client> =>
    ipcRenderer.invoke(IpcChannels.createClient, payload),
  updateClient: (
    clientId: string,
    patch: Partial<ClientWritePayload> & { actif?: boolean },
  ): Promise<Client> =>
    ipcRenderer.invoke(IpcChannels.updateClient, { clientId, patch }),
  checkSaleClient: (payload: SaleClientCheckPayload): Promise<SaleClientCheckResponse> =>
    ipcRenderer.invoke(IpcChannels.checkSaleClient, payload),
  createSale: (payload: CreateSalePayload): Promise<Sale> =>
    ipcRenderer.invoke(IpcChannels.createSale, payload),
  cancelSale: (payload: CancelSalePayload): Promise<Sale> =>
    ipcRenderer.invoke(IpcChannels.cancelSale, payload),
  recordSalePayment: (payload: RecordSalePaymentPayload): Promise<Sale> =>
    ipcRenderer.invoke(IpcChannels.recordSalePayment, payload),
  listSaleHistory: (query?: SaleHistoryQuery): Promise<SaleHistoryResponse> =>
    ipcRenderer.invoke(IpcChannels.listSaleHistory, query),
  getSaleDetail: (saleId: string): Promise<Sale> =>
    ipcRenderer.invoke(IpcChannels.getSaleDetail, saleId),
  getPrinterSettings: (): Promise<PrinterSettings> =>
    ipcRenderer.invoke(IpcChannels.getPrinterSettings),
  setPrinterSettings: (patch: Partial<PrinterSettings>): Promise<PrinterSettings> =>
    ipcRenderer.invoke(IpcChannels.setPrinterSettings, patch),
  getConnectionSettings: (): Promise<ConnectionSettingsView> =>
    ipcRenderer.invoke(IpcChannels.getConnectionSettings),
  setConnectionSettings: (
    patch: Partial<ConnectionSettings>,
  ): Promise<ConnectionSettingsView> =>
    ipcRenderer.invoke(IpcChannels.setConnectionSettings, patch),
  listPrinters: (): Promise<PrinterInfo[]> => ipcRenderer.invoke(IpcChannels.listPrinters),
  printSaleReceipt: (
    payload: SaleReceiptPayload,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.printSaleReceipt, payload),
  getOfflineQueueState: (): Promise<OfflineQueueState> =>
    ipcRenderer.invoke(IpcChannels.getOfflineQueueState),
  flushOfflineQueue: (): Promise<FlushOfflineQueueResult> =>
    ipcRenderer.invoke(IpcChannels.flushOfflineQueue),
  getDailyReport: (query?: DailyReportQuery): Promise<DailyReport> =>
    ipcRenderer.invoke(IpcChannels.getDailyReport, query),
  onSessionExpired: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on(IpcChannels.onSessionExpired, listener);
    return () => ipcRenderer.removeListener(IpcChannels.onSessionExpired, listener);
  },
  onOfflineQueueChanged: (cb: (state: OfflineQueueState) => void): (() => void) => {
    const listener = (_: IpcRendererEvent, state: OfflineQueueState) => cb(state);
    ipcRenderer.on(IpcChannels.onOfflineQueueChanged, listener);
    return () => ipcRenderer.removeListener(IpcChannels.onOfflineQueueChanged, listener);
  },
};

contextBridge.exposeInMainWorld("teka", api);

export type TekaApi = typeof api;
