import { safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAppPaths } from "./paths";

const TOKEN_FILE = "session.token";

function tokenPath() {
  const dir = getAppPaths().config;
  mkdirSync(dir, { recursive: true });
  return join(dir, TOKEN_FILE);
}

export function getSessionToken(): string | null {
  const file = tokenPath();
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(raw);
    }
    return raw.toString("utf8");
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  const file = tokenPath();
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(file, safeStorage.encryptString(token));
  } else {
    writeFileSync(file, token, "utf8");
  }
}

export function clearSessionToken(): void {
  const file = tokenPath();
  if (existsSync(file)) {
    rmSync(file, { force: true });
  }
}
