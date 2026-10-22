import { net } from "electron";
import { appConfig, assertApiConfigured } from "./config";
import { getSessionToken } from "./session";

export function joinApiUrl(path: string): string {
  assertApiConfigured();
  const base = appConfig.apiBaseUrl;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const basePath = new URL(base).pathname.replace(/\/+$/, "");

  // Avoid /api/api when base already ends with /api
  if (basePath.endsWith("/api") && (normalized === "/api" || normalized.startsWith("/api/"))) {
    return `${base}${normalized.slice(4)}`;
  }
  return `${base}${normalized}`;
}

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  token?: string | null;
  auth?: boolean;
};

function buildQuery(
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Codes stables pour le renderer (i18n) — ne jamais exposer net::ERR_* à l’UI. */
export type ApiNetworkCode =
  | "NETWORK_CHANGED"
  | "OFFLINE"
  | "TIMEOUT"
  | "DNS"
  | "REFUSED"
  | "GENERIC";

export function classifyNetworkError(err: unknown): ApiNetworkCode {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    if (cur instanceof Error) parts.push(cur.name, cur.message);
    else parts.push(String(cur));
    cur =
      cur && typeof cur === "object" && "cause" in cur
        ? (cur as { cause?: unknown }).cause
        : undefined;
  }
  const text = parts.join(" ");

  if (/ERR_NETWORK_CHANGED|NETWORK_CHANGED/i.test(text)) return "NETWORK_CHANGED";
  if (/ERR_INTERNET_DISCONNECTED|ENETUNREACH|ERR_NETWORK_ACCESS_DENIED/i.test(text)) {
    return "OFFLINE";
  }
  if (
    /timeout|TIMED_OUT|UND_ERR_CONNECT|ConnectTimeout|ETIMEDOUT|AbortError|ERR_CONNECTION_TIMED_OUT/i.test(
      text,
    )
  ) {
    return "TIMEOUT";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION/i.test(text)) {
    return "DNS";
  }
  if (
    /ECONNREFUSED|ECONNRESET|ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_ADDRESS_UNREACHABLE/i.test(
      text,
    )
  ) {
    return "REFUSED";
  }
  if (/fetch failed|net::ERR_/i.test(text)) return "GENERIC";
  return "GENERIC";
}

function networkErrorMessage(err: unknown): string {
  // Préfixe TEKA_NET: pour que le renderer mappe en i18n même via le wrapper IPC.
  return `TEKA_NET:${classifyNetworkError(err)}`;
}

/**
 * Appels API via `net.fetch` (stack réseau Chromium) — plus fiable que
 * undici/Node `fetch` sur des hôtes lents / timeouts de connexion.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const token =
    options.token !== undefined
      ? options.token
      : options.auth === false
        ? null
        : getSessionToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${joinApiUrl(path)}${buildQuery(options.query)}`;

  let response: Response;
  try {
    response = await net.fetch(url, {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    throw new Error(networkErrorMessage(err));
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : `Erreur API (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
