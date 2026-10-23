/**
 * Runtime config — read lazily so loadEnvFiles() can run first.
 * Never put private signing keys here.
 */
import { resolveApiBaseUrl } from "./connection-settings";

function env(name: string, fallback = "") {
  return process.env[name]?.trim() ?? fallback;
}

export const appConfig = {
  productName: "TekaHub",
  get apiBaseUrl() {
    return resolveApiBaseUrl();
  },
  get packsUpdateUrl() {
    return env("PACKS_UPDATE_URL");
  },
  get packsPublicKey() {
    return env("PACKS_PUBLIC_KEY");
  },
  get updateProvider() {
    // generic = latest.yml via releases/latest/download (fiable si le dépôt est public)
    return env("UPDATE_PROVIDER", "generic") as "github" | "generic";
  },
  get ghOwner() {
    return env("GH_OWNER", "niwy2025");
  },
  get ghRepo() {
    return env("GH_REPO", "tekahub-desktop");
  },
  get updateUrl() {
    return env("UPDATE_URL");
  },
  get skipUpdateCheck() {
    return env("TEKA_SKIP_UPDATE_CHECK") === "1";
  },
  get skipPackCheck() {
    return env("TEKA_SKIP_PACK_CHECK") === "1";
  },
  corePackId: "core-ui",
};

export function assertApiConfigured(): void {
  if (!appConfig.apiBaseUrl) {
    throw new Error(
      "URL API manquante. Configure-la dans Paramètres (ex: https://api-tekahub.niwytech.cloud)",
    );
  }
  try {
    const url = new URL(appConfig.apiBaseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("L’URL API doit utiliser http ou https");
    }
  } catch (err) {
    if (err instanceof Error && /URL API|http ou https/.test(err.message)) throw err;
    throw new Error("L’URL API n’est pas valide");
  }
}
