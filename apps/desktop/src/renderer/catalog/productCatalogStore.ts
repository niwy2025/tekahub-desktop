import type { AppLocale, Product } from "@teka/shared";
import { friendlyProductsError } from "../i18n/messages";

const CACHE_KEY = "teka.product-catalog.v1";

/** Intervalle de refresh arrière-plan : ~8–12 min (aléatoire autour de 10 min). */
const REFRESH_MIN_MS = 8 * 60 * 1000;
const REFRESH_MAX_MS = 12 * 60 * 1000;

export type CatalogState = {
  products: Product[];
  loading: boolean;
  /** Refresh silencieux (pas de skeleton). */
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
};

type CachePayload = {
  products: Product[];
  fetchedAt: number;
};

let state: CatalogState = {
  products: [],
  loading: false,
  refreshing: false,
  error: null,
  lastFetchedAt: null,
};

let loadPromise: Promise<void> | null = null;
let refreshTimer: number | null = null;
let currentLocale: AppLocale = "fr";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<CatalogState>) {
  state = { ...state, ...patch };
  emit();
}

function readDiskCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!Array.isArray(parsed.products) || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDiskCache(products: Product[], fetchedAt: number) {
  try {
    const payload: CachePayload = { products, fetchedAt };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

function clearDiskCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

function isTransientNetworkError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return /TEKA_NET:NETWORK_CHANGED|ERR_NETWORK_CHANGED|NETWORK_CHANGED/i.test(raw);
}

async function fetchFromApi(): Promise<Product[]> {
  if (!window.teka) return [];
  const load = () =>
    window.teka!.listProducts({
      type: "produit",
      per_page: 200,
      page: 1,
      actif: true,
    });

  try {
    return await load();
  } catch (first) {
    if (!isTransientNetworkError(first)) throw first;
    await new Promise((r) => window.setTimeout(r, 800));
    return load();
  }
}

function nextRefreshDelayMs(): number {
  return REFRESH_MIN_MS + Math.floor(Math.random() * (REFRESH_MAX_MS - REFRESH_MIN_MS));
}

function scheduleBackgroundRefresh() {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  refreshTimer = window.setTimeout(() => {
    void refreshCatalog({ silent: true }).finally(() => {
      scheduleBackgroundRefresh();
    });
  }, nextRefreshDelayMs());
}

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCatalogSnapshot(): CatalogState {
  return state;
}

/**
 * Hydrate depuis le cache disque (immédiat) puis fetch réseau si besoin.
 * Appelé une fois après login — pas à chaque visite de la caisse.
 */
export async function ensureCatalogLoaded(locale: AppLocale): Promise<void> {
  currentLocale = locale;

  // Déjà en mémoire
  if (state.products.length > 0 || state.loading) {
    scheduleBackgroundRefresh();
    if (state.products.length > 0) return;
    if (loadPromise) return loadPromise;
  }

  // Cache offline local
  const cached = readDiskCache();
  if (cached && cached.products.length > 0) {
    setState({
      products: cached.products,
      loading: false,
      error: null,
      lastFetchedAt: cached.fetchedAt,
    });
    scheduleBackgroundRefresh();
    // Refresh silencieux si le cache a plus de ~10 min
    if (Date.now() - cached.fetchedAt > REFRESH_MIN_MS) {
      void refreshCatalog({ silent: true });
    }
    return;
  }

  if (loadPromise) return loadPromise;

  setState({ loading: true, error: null });
  loadPromise = (async () => {
    try {
      const products = await fetchFromApi();
      const fetchedAt = Date.now();
      writeDiskCache(products, fetchedAt);
      setState({
        products,
        loading: false,
        error: null,
        lastFetchedAt: fetchedAt,
        refreshing: false,
      });
      scheduleBackgroundRefresh();
    } catch (err) {
      setState({
        products: [],
        loading: false,
        error: friendlyProductsError(locale, err),
        refreshing: false,
      });
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/** Recharge le catalogue (manuel ou arrière-plan). */
export async function refreshCatalog(options?: {
  silent?: boolean;
  locale?: AppLocale;
}): Promise<void> {
  const locale = options?.locale ?? currentLocale;
  const silent = options?.silent ?? false;

  if (!window.teka) return;
  if (state.loading || state.refreshing) return;

  setState(silent ? { refreshing: true, error: null } : { loading: true, error: null });

  try {
    const products = await fetchFromApi();
    const fetchedAt = Date.now();
    writeDiskCache(products, fetchedAt);
    setState({
      products,
      loading: false,
      refreshing: false,
      error: null,
      lastFetchedAt: fetchedAt,
    });
  } catch (err) {
    // En silencieux : on garde l’ancien catalogue (mode offline).
    if (silent && state.products.length > 0) {
      setState({ refreshing: false });
      return;
    }
    setState({
      loading: false,
      refreshing: false,
      error: friendlyProductsError(locale, err),
    });
  }
}

export function clearCatalog(): void {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  loadPromise = null;
  clearDiskCache();
  setState({
    products: [],
    loading: false,
    refreshing: false,
    error: null,
    lastFetchedAt: null,
  });
}
