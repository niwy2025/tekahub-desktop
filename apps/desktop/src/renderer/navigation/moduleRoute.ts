import { MODULE_ORDER, type AppModule } from "../keyboard/shortcuts";

/** Hash routes: `#/pos`, `#/history`, … — survivent au F5. */
export function moduleFromHash(hash = typeof window !== "undefined" ? window.location.hash : ""): AppModule {
  const raw = hash.replace(/^#\/?/, "").trim();
  const segment = (raw.split(/[/?#]/)[0] || "").toLowerCase();
  if ((MODULE_ORDER as string[]).includes(segment)) {
    return segment as AppModule;
  }
  return "pos";
}

export function hashForModule(module: AppModule): string {
  return `#/${module}`;
}

/** Met à jour le hash sans empiler d’entrée si déjà sur le même module. */
export function syncModuleHash(module: AppModule): void {
  if (typeof window === "undefined") return;
  const next = hashForModule(module);
  if (window.location.hash === next) return;
  // replaceState évite de polluer l’historique quand on initialise #/pos.
  const url = `${window.location.pathname}${window.location.search}${next}`;
  window.history.replaceState(null, "", url);
}

/** Navigation utilisateur : pousse une entrée hash (retour navigateur possible). */
export function navigateModuleHash(module: AppModule): void {
  if (typeof window === "undefined") return;
  const next = hashForModule(module);
  if (window.location.hash === next) return;
  window.location.hash = next;
}
