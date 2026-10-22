import { app } from "electron";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import type { AppPaths } from "@teka/shared";

/**
 * Contenu dynamique hors du dossier d'installation :
 * Windows  → %APPDATA%/TekaHub/
 * macOS    → ~/Library/Application Support/TekaHub/
 * Linux    → ~/.config/TekaHub/
 *
 * Electron `userData` suit déjà ces chemins quand productName = TekaHub.
 */
export function getAppPaths(): AppPaths {
  const root = app.getPath("userData");
  const paths: AppPaths = {
    root,
    packs: join(root, "packs"),
    cache: join(root, "cache"),
    config: join(root, "config"),
  };
  for (const dir of Object.values(paths)) {
    mkdirSync(dir, { recursive: true });
  }
  return paths;
}

export function packVersionDir(packId: string, version: string): string {
  return join(getAppPaths().packs, packId, `version-${version}`);
}

export function packCurrentLink(packId: string): string {
  return join(getAppPaths().packs, packId, "current.json");
}
