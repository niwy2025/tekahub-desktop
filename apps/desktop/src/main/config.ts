/**
 * Runtime config — values injected at build via env, or defaults for local dev.
 * Never put private signing keys here.
 */
export const appConfig = {
  productName: "TekaHub",
  /** Packs CDN / manifest base URL */
  packsUpdateUrl: process.env.PACKS_UPDATE_URL ?? "",
  /** Ed25519 public key (PEM or base64 SPKI) for pack verification */
  packsPublicKey: process.env.PACKS_PUBLIC_KEY ?? "",
  /** electron-updater: github | generic */
  updateProvider: (process.env.UPDATE_PROVIDER ?? "github") as "github" | "generic",
  ghOwner: process.env.GH_OWNER ?? "your-org",
  ghRepo: process.env.GH_REPO ?? "teka-desktop",
  updateUrl: process.env.UPDATE_URL ?? "",
  skipUpdateCheck: process.env.TEKA_SKIP_UPDATE_CHECK === "1",
  skipPackCheck: process.env.TEKA_SKIP_PACK_CHECK === "1",
  /** Default pack id checked at startup */
  corePackId: "core-ui",
};
