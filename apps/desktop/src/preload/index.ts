import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import {
  IpcChannels,
  type AppInfo,
  type PackLocalState,
  type PackUpdateState,
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
};

contextBridge.exposeInMainWorld("teka", api);

export type TekaApi = typeof api;
