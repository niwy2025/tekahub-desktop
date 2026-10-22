import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Charge .env depuis la racine monorepo et apps/desktop.
 * En prod packagée, les variables peuvent aussi être injectées au build / CI.
 */
export function loadEnvFiles(): void {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), ".env.local"),
    join(process.cwd(), "apps/desktop/.env"),
    join(process.cwd(), "../../.env"),
    join(__dirname, "../../../../.env"),
    join(__dirname, "../../../.env"),
  ];

  const seen = new Set<string>();
  for (const file of candidates) {
    const abs = resolve(file);
    if (seen.has(abs) || !existsSync(abs)) continue;
    seen.add(abs);
    loadDotenv({ path: abs, override: false, quiet: true });
  }
}
