/** Shell (Electron app) release manifest — hosted next to installers. */
export interface ShellReleaseManifest {
  version: string;
  /** Download URL for the platform artifact (optional if using electron-updater GH provider). */
  url?: string;
  sha256?: string;
  signature?: string;
  changelog?: string;
  publishedAt?: string;
}

/** Pack archive + metadata published for dynamic content. */
export interface PackManifest {
  id: string;
  version: string;
  /** Relative or absolute URL of the .zip / .tar.gz archive. */
  url: string;
  sha256: string;
  /** Ed25519 signature over `${id}:${version}:${sha256}` (hex). */
  signature: string;
  /** Entry file relative to extracted pack root (e.g. index.html or main.js). */
  entrypoint: string;
  /** Minimum compatible shell version. */
  minShellVersion: string;
  changelog?: string;
  publishedAt?: string;
}

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface ShellUpdateState {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion?: string;
  progress?: number;
  message?: string;
  error?: string;
}

export interface PackUpdateState {
  packId: string;
  status: UpdateStatus;
  currentVersion?: string;
  availableVersion?: string;
  progress?: number;
  message?: string;
  error?: string;
}

export interface PackLocalState {
  id: string;
  version: string;
  path: string;
  entrypoint: string;
  previousVersion?: string;
  previousPath?: string;
}

export interface AppPaths {
  root: string;
  packs: string;
  cache: string;
  config: string;
}

/** IPC channel names — keep in sync with preload. */
export const IpcChannels = {
  getAppInfo: "teka:get-app-info",
  getUpdateState: "teka:get-update-state",
  checkUpdates: "teka:check-updates",
  installShellUpdate: "teka:install-shell-update",
  getPacksState: "teka:get-packs-state",
  applyPackUpdate: "teka:apply-pack-update",
  rollbackPack: "teka:rollback-pack",
  onShellUpdate: "teka:on-shell-update",
  onPackUpdate: "teka:on-pack-update",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  userDataPath: string;
  isPackaged: boolean;
}
