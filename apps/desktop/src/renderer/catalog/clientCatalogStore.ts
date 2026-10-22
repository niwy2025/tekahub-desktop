import type { AppLocale, Client } from "@teka/shared";
import { friendlyNetworkError } from "../i18n/messages";

const CACHE_KEY = "teka.client-catalog.v1";
const REFRESH_MIN_MS = 8 * 60 * 1000;
const REFRESH_MAX_MS = 12 * 60 * 1000;

export type ClientCatalogState = {
  clients: Client[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastFetchedAt: number | null;
};

type CachePayload = { clients: Client[]; fetchedAt: number };

let state: ClientCatalogState = {
  clients: [],
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

function setState(patch: Partial<ClientCatalogState>) {
  state = { ...state, ...patch };
  emit();
}

function readDiskCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!Array.isArray(parsed.clients) || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDiskCache(clients: Client[], fetchedAt: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ clients, fetchedAt } satisfies CachePayload));
  } catch {
    // ignore
  }
}

function clearDiskCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

/** Normalise un téléphone pour comparaison locale (chiffres uniquement). */
export function normalizePhone(value?: string | null): string {
  return (value ?? "").replace(/\D+/g, "");
}

export function findClientByPhone(phone: string, clients: Client[]): Client | null {
  const needle = normalizePhone(phone);
  if (!needle || needle.length < 6) return null;

  const exact = clients.find((c) => normalizePhone(c.telephone) === needle);
  if (exact) return exact;

  // Suffixe (ex. 243976… vs 0976…)
  return (
    clients.find((c) => {
      const hay = normalizePhone(c.telephone);
      if (!hay) return false;
      return hay.endsWith(needle) || needle.endsWith(hay);
    }) ?? null
  );
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
    void refreshClients({ silent: true }).finally(() => scheduleBackgroundRefresh());
  }, nextRefreshDelayMs());
}

async function fetchFromApi(): Promise<Client[]> {
  if (!window.teka?.listClients) return [];
  return window.teka.listClients();
}

export function subscribeClients(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClientsSnapshot(): ClientCatalogState {
  return state;
}

export async function ensureClientsLoaded(locale: AppLocale): Promise<void> {
  currentLocale = locale;

  if (state.clients.length > 0 || state.loading) {
    scheduleBackgroundRefresh();
    if (state.clients.length > 0) return;
    if (loadPromise) return loadPromise;
  }

  const cached = readDiskCache();
  if (cached && cached.clients.length > 0) {
    setState({
      clients: cached.clients,
      loading: false,
      error: null,
      lastFetchedAt: cached.fetchedAt,
    });
    scheduleBackgroundRefresh();
    if (Date.now() - cached.fetchedAt > REFRESH_MIN_MS) {
      void refreshClients({ silent: true });
    }
    return;
  }

  if (loadPromise) return loadPromise;

  setState({ loading: true, error: null });
  loadPromise = (async () => {
    try {
      const clients = await fetchFromApi();
      const fetchedAt = Date.now();
      writeDiskCache(clients, fetchedAt);
      setState({
        clients,
        loading: false,
        error: null,
        lastFetchedAt: fetchedAt,
        refreshing: false,
      });
      scheduleBackgroundRefresh();
    } catch (err) {
      setState({
        clients: [],
        loading: false,
        error: friendlyNetworkError(locale, err),
        refreshing: false,
      });
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export async function refreshClients(options?: {
  silent?: boolean;
  locale?: AppLocale;
}): Promise<void> {
  const locale = options?.locale ?? currentLocale;
  const silent = options?.silent ?? false;
  if (!window.teka?.listClients) return;
  if (state.loading || state.refreshing) return;

  setState(silent ? { refreshing: true, error: null } : { loading: true, error: null });

  try {
    const clients = await fetchFromApi();
    const fetchedAt = Date.now();
    writeDiskCache(clients, fetchedAt);
    setState({
      clients,
      loading: false,
      refreshing: false,
      error: null,
      lastFetchedAt: fetchedAt,
    });
  } catch (err) {
    if (silent && state.clients.length > 0) {
      setState({ refreshing: false });
      return;
    }
    setState({
      loading: false,
      refreshing: false,
      error: friendlyNetworkError(locale, err),
    });
  }
}

/** Après une vente avec nouveau client : ajoute en mémoire (sans attendre le refresh). */
export function upsertLocalClient(client: Client): void {
  if (!client.id) return;
  const without = state.clients.filter((c) => c.id !== client.id);
  const clients = [client, ...without];
  const fetchedAt = state.lastFetchedAt ?? Date.now();
  writeDiskCache(clients, fetchedAt);
  setState({ clients, lastFetchedAt: fetchedAt });
}

export function clearClients(): void {
  if (refreshTimer !== null) {
    window.clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  loadPromise = null;
  clearDiskCache();
  setState({
    clients: [],
    loading: false,
    refreshing: false,
    error: null,
    lastFetchedAt: null,
  });
}
