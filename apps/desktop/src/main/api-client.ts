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

  const response = await fetch(`${joinApiUrl(path)}${buildQuery(options.query)}`, {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

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
