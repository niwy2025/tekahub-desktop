/**
 * Runtime config — read lazily so loadEnvFiles() can run first.
 * Never put private signing keys here.
 */
function trimSlash(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function env(name: string, fallback = "") {
  return process.env[name]?.trim() ?? fallback;
}

export const appConfig = {
  productName: "TekaHub",
  get apiBaseUrl() {
    return trimSlash(env("API_BASE_URL"));
  },
  get packsUpdateUrl() {
    return env("PACKS_UPDATE_URL");
  },
  get packsPublicKey() {
    return env("PACKS_PUBLIC_KEY");
  },
  get updateProvider() {
    return (env("UPDATE_PROVIDER", "github") as "github" | "generic");
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
      "API_BASE_URL manquante. Définis-la dans .env (ex: https://api-tekahub.niwytech.cloud)",
    );
  }
  try {
    const url = new URL(appConfig.apiBaseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("API_BASE_URL doit utiliser http ou https");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("API_BASE_URL")) throw err;
    throw new Error("API_BASE_URL n'est pas une URL valide");
  }
}
