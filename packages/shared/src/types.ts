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
  getSession: "teka:get-session",
  login: "teka:login",
  logout: "teka:logout",
  getMe: "teka:get-me",
  getLocale: "teka:get-locale",
  setLocale: "teka:set-locale",
  listProducts: "teka:list-products",
  listClients: "teka:list-clients",
  checkSaleClient: "teka:check-sale-client",
  createSale: "teka:create-sale",
  cancelSale: "teka:cancel-sale",
  listSaleHistory: "teka:list-sale-history",
  getSaleDetail: "teka:get-sale-detail",
  getPrinterSettings: "teka:get-printer-settings",
  setPrinterSettings: "teka:set-printer-settings",
  listPrinters: "teka:list-printers",
  printSaleReceipt: "teka:print-sale-receipt",
  onSessionExpired: "teka:on-session-expired",
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

export type AppLocale = "fr" | "en";

export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  userDataPath: string;
  isPackaged: boolean;
  apiConfigured: boolean;
  apiBaseUrl: string | null;
  locale: AppLocale;
  deviceLocale: AppLocale;
}

export interface LocaleInfo {
  locale: AppLocale;
  deviceLocale: AppLocale;
}

export interface AuthUser {
  id: string;
  name: string;
  prenom?: string;
  email: string;
  type_utilisateur?: string;
  roles?: string[];
  entreprise?: {
    id?: string;
    nom?: string;
    devise?: string | null;
  } | null;
  branche?: {
    id?: string;
    nom?: string;
  } | null;
}

export interface AuthSelectableProfile {
  id: string;
  name?: string;
  email?: string;
  entreprise?: { id?: string; nom?: string } | null;
  type_utilisateur?: string;
}

export type AuthLoginResult =
  | { status: "authenticated"; user: AuthUser }
  | {
      status: "profile_selection";
      profiles: AuthSelectableProfile[];
      message?: string;
    };

export interface SessionInfo {
  authenticated: boolean;
  apiConfigured: boolean;
  apiBaseUrl: string | null;
}

/** Produit catalogue / caisse (champs utiles POS). */
export interface Product {
  id: string;
  nom: string;
  sku?: string | null;
  type?: string | null;
  code_barre?: string | null;
  prix_vente?: number | string | null;
  prix_vente_ttc?: number | string | null;
  stock?: number | null;
  stock_disponible?: number | null;
  est_vendable?: boolean | number;
  actif?: boolean | number;
  categorie?: { id: string; nom: string } | null;
}

export interface ProductListQuery {
  search?: string;
  type?: "produit" | "service";
  per_page?: number;
  page?: number;
  /** Aligné front : true = actifs seulement */
  actif?: boolean;
}

/** Client CRM (champs utiles POS). */
export interface Client {
  id: string;
  nom?: string | null;
  telephone?: string | null;
  email?: string | null;
  adresse?: string | null;
  notes?: string | null;
  solde_points_fidelite?: number | string | null;
  actif?: boolean | null;
}

export type SaleClientCheckPayload = {
  client_id?: string | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  client_email?: string | null;
};

export type SaleClientCheckResponse = {
  matched?: boolean;
  matched_by?: "client_id" | "telephone" | "email" | string | null;
  client?: Client | null;
  normalized?: {
    client_nom?: string | null;
    client_telephone?: string | null;
    client_email?: string | null;
  } | null;
};

export type PaymentMethod =
  | "especes"
  | "mobile_money"
  | "carte_bancaire"
  | "virement"
  | "autre";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "especes",
  "mobile_money",
  "carte_bancaire",
  "virement",
  "autre",
];

export type SaleLinePayload = {
  produit_id: string;
  quantite: number;
  prix_unitaire?: number;
};

export type CreateSalePayload = {
  client_id?: string | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  client_email?: string | null;
  moyen_paiement: PaymentMethod | string;
  statut: string;
  montant_paye_initial?: number;
  lignes: SaleLinePayload[];
};

/** Soft-cancel : PUT /api/ventes/{id} avec statut annulee + lignes. */
export type CancelSalePayload = {
  saleId: string;
  lignes: SaleLinePayload[];
  moyen_paiement?: PaymentMethod | string | null;
  client_id?: string | null;
  client_nom?: string | null;
  client_telephone?: string | null;
};

export type SaleItem = {
  id?: string;
  produit_id?: string | null;
  produit_nom?: string | null;
  quantite?: number | string | null;
  prix_unitaire?: number | string | null;
  total_ligne?: number | string | null;
  produit?: { id?: string; nom?: string | null } | null;
};

export type Sale = {
  id: string;
  reference?: string | null;
  date_vente?: string | null;
  statut?: string | null;
  moyen_paiement?: string | null;
  montant_total?: number | string | null;
  montant_paye?: number | string | null;
  montant_restant?: number | string | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  devise_principale?: string | null;
  items?: SaleItem[] | null;
};

export type SaleHistoryQuery = {
  limit?: number;
  date_from?: string | null;
  date_to?: string | null;
};

export type SaleHistoryGroup = {
  date: string;
  label: string;
  total_count: number;
  total_amount: number;
  ventes: Sale[];
};

export type SaleHistoryResponse = {
  server_time?: string;
  timezone?: string;
  groups: SaleHistoryGroup[];
  meta?: {
    limit?: number;
    date_from?: string | null;
    date_to?: string | null;
  };
};

export type SaleDetailResponse = {
  server_time?: string;
  timezone?: string;
  entity?: string;
  data: Sale;
};

export type PrinterInfo = {
  name: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
};

export type PrinterSettings = {
  /** Imprimer automatiquement après une vente réussie. */
  autoPrintAfterSale: boolean;
  /** Impression silencieuse (sans boîte de dialogue système). */
  silentPrint: boolean;
  /** Nom imprimante système, ou null = imprimante par défaut. */
  printerName: string | null;
};

export type SaleReceiptLine = {
  nom: string;
  qty: number;
  unit: number;
  total: number;
};

export type SaleReceiptPayload = {
  locale: AppLocale;
  currency?: string | null;
  companyName?: string | null;
  branchName?: string | null;
  sale: Sale;
  lines: SaleReceiptLine[];
  /** Espèces reçues (affichage ticket caissier). */
  cashReceived?: number | null;
  /** Monnaie à rendre. */
  changeDue?: number | null;
};
