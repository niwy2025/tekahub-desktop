import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAppPaths } from "./paths";

export type AppLocale = "fr" | "en";

const LOCALE_FILE = "locale.json";

export function normalizeLocale(value?: string | null): AppLocale {
  const raw = (value ?? "").toLowerCase();
  if (raw.startsWith("en")) return "en";
  return "fr";
}

function localePath() {
  const dir = getAppPaths().config;
  mkdirSync(dir, { recursive: true });
  return join(dir, LOCALE_FILE);
}

/** Device OS locale (Electron), fallback fr. */
export function getDeviceLocale(): AppLocale {
  return normalizeLocale(app.getLocale());
}

/** Preference utilisateur si définie, sinon langue du device. */
export function getAppLocale(): AppLocale {
  const file = localePath();
  if (!existsSync(file)) return getDeviceLocale();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { locale?: string };
    if (parsed.locale === "fr" || parsed.locale === "en") return parsed.locale;
  } catch {
    // ignore
  }
  return getDeviceLocale();
}

export function setAppLocale(locale: AppLocale): AppLocale {
  const next = normalizeLocale(locale);
  writeFileSync(localePath(), JSON.stringify({ locale: next }, null, 2), "utf8");
  return next;
}
