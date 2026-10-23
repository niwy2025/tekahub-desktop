import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ConnectionSettings } from "@teka/shared";
import { getAppPaths } from "./paths";

const FILE = "connection.json";

/** URL API TekaHub par défaut (prod) — l’utilisateur peut la changer dans Paramètres. */
export const DEFAULT_API_BASE_URL = "https://api-tekahub.niwytech.cloud";

function settingsPath() {
  const dir = getAppPaths().config;
  mkdirSync(dir, { recursive: true });
  return join(dir, FILE);
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed || null;
}

export function getConnectionSettings(): ConnectionSettings {
  const file = settingsPath();
  if (!existsSync(file)) {
    return { apiBaseUrl: null };
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<ConnectionSettings>;
    return { apiBaseUrl: normalizeUrl(parsed.apiBaseUrl) };
  } catch {
    return { apiBaseUrl: null };
  }
}

export function setConnectionSettings(patch: Partial<ConnectionSettings>): ConnectionSettings {
  const current = getConnectionSettings();
  const next: ConnectionSettings = {
    apiBaseUrl:
      patch.apiBaseUrl === null
        ? null
        : typeof patch.apiBaseUrl === "string"
          ? normalizeUrl(patch.apiBaseUrl)
          : current.apiBaseUrl,
  };

  if (next.apiBaseUrl) {
    let url: URL;
    try {
      url = new URL(next.apiBaseUrl);
    } catch {
      throw new Error("URL API invalide");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("L’URL API doit utiliser http ou https");
    }
    next.apiBaseUrl = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/+$/, "");
  }

  writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

/**
 * Résolution effective :
 * 1. API_BASE_URL dans l’environnement (.env / process) — prioritaire en dev
 * 2. Valeur enregistrée dans userData/config/connection.json
 * 3. URL de production par défaut
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = normalizeUrl(process.env.API_BASE_URL);
  if (fromEnv) return fromEnv;
  const saved = getConnectionSettings().apiBaseUrl;
  if (saved) return saved;
  return DEFAULT_API_BASE_URL;
}
