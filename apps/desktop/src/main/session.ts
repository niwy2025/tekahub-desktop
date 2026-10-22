import { safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AuthUser } from "@teka/shared";
import { getAppPaths } from "./paths";

const TOKEN_FILE = "session.token";
const USER_FILE = "session.user.json";

function configDir() {
  const dir = getAppPaths().config;
  mkdirSync(dir, { recursive: true });
  return dir;
}

function tokenPath() {
  return join(configDir(), TOKEN_FILE);
}

function userPath() {
  return join(configDir(), USER_FILE);
}

function writeSecret(file: string, value: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(file, safeStorage.encryptString(value));
  } else {
    writeFileSync(file, value, "utf8");
  }
}

function readSecret(file: string): string | null {
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

export function getSessionToken(): string | null {
  return readSecret(tokenPath());
}

export function setSessionToken(token: string): void {
  writeSecret(tokenPath(), token);
}

export function getCachedUser(): AuthUser | null {
  const raw = readSecret(userPath());
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as AuthUser;
    if (user?.id && user?.email) return user;
  } catch {
    // ignore
  }
  return null;
}

export function setCachedUser(user: AuthUser): void {
  writeSecret(userPath(), JSON.stringify(user));
}

export function clearSessionToken(): void {
  for (const file of [tokenPath(), userPath()]) {
    if (existsSync(file)) rmSync(file, { force: true });
  }
}
