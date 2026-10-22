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
  type ClientStatsResponse,
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
  listClients: (): Promise<Client[]> => ipcRenderer.invoke(IpcChannels.listClients),
  getClientStats: (clientId: string): Promise<ClientStatsResponse> =>
    ipcRenderer.invoke(IpcChannels.getClientStats, clientId),
  checkSaleClient: (payload: SaleClientCheckPayload): Promise<SaleClientCheckResponse> =>
    ipcRenderer.invoke(IpcChannels.checkSaleClient, payload),
  createSale: (payload: CreateSalePayload): Promise<Sale> =>
    ipcRenderer.invoke(IpcChannels.createSale, payload),
  listSaleHistory: (query?: SaleHistoryQuery): Promise<SaleHistoryResponse> =>
    ipcRenderer.invoke(IpcChannels.listSaleHistory, query),
  getSaleDetail: (saleId: string): Promise<Sale> =>
    ipcRenderer.invoke(IpcChannels.getSaleDetail, saleId),
  getPrinterSettings: (): Promise<PrinterSettings> =>
    ipcRenderer.invoke(IpcChannels.getPrinterSettings),
  setPrinterSettings: (patch: Partial<PrinterSettings>): Promise<PrinterSettings> =>
    ipcRenderer.invoke(IpcChannels.setPrinterSettings, patch),
  listPrinters: (): Promise<PrinterInfo[]> => ipcRenderer.invoke(IpcChannels.listPrinters),
  printSaleReceipt: (
    payload: SaleReceiptPayload,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(IpcChannels.printSaleReceipt, payload),
  onSessionExpired: (cb: () => void): (() => void) => {
    const listener = (): void => cb();
    ipcRenderer.on(IpcChannels.onSessionExpired, listener);
    return () => ipcRenderer.removeListener(IpcChannels.onSessionExpired, listener);
  },
};

contextBridge.exposeInMainWorld("teka", api);

export type TekaApi = typeof api;
