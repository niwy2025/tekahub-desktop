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

function networkErrorMessage(err: unknown): string {
  const root =
    err && typeof err === "object" && "cause" in err
      ? ((err as { cause?: unknown }).cause ?? err)
      : err;
  const text = root instanceof Error ? `${root.name} ${root.message}` : String(root);
  if (/timeout|UND_ERR_CONNECT|ConnectTimeout|ETIMEDOUT|AbortError/i.test(text)) {
    return "Impossible de joindre l’API (délai dépassé). Vérifiez la connexion puis réessayez.";
  }
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(text)) {
    return "Impossible de résoudre l’hôte API. Vérifiez API_BASE_URL et le DNS.";
  }
  if (/ECONNREFUSED|ECONNRESET|fetch failed/i.test(text)) {
    return "Connexion à l’API refusée ou interrompue. Réessayez dans un instant.";
  }
  return err instanceof Error ? err.message : String(err);
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
