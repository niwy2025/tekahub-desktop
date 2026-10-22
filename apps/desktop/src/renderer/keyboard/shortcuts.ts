/**
 * Raccourcis POS — inspirés Odoo POS / caisses retail :
 * Enter = valider, Esc = annuler/retour, F2 = aide, Ctrl+n = modules.
 * Éviter F5/F11/F12 (réservés navigateur/Chromium).
 */
export type ShortcutAction =
  | "help"
  | "nav.pos"
  | "nav.products"
  | "nav.customers"
  | "nav.history"
  | "nav.settings"
  | "focus.search"
  | "logout";

export type ShortcutDef = {
  action: ShortcutAction;
  /** Affichage aide (ex: "F2", "Ctrl+1") */
  label: string;
  descriptionKey:
    | "shortcutHelp"
    | "shortcutNavPos"
    | "shortcutNavProducts"
    | "shortcutNavCustomers"
    | "shortcutNavHistory"
    | "shortcutNavSettings"
    | "shortcutFocusSearch"
    | "shortcutLogout";
  match: (e: KeyboardEvent) => boolean;
};

const isMod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

export const SHORTCUTS: ShortcutDef[] = [
  {
    action: "help",
    label: "F2",
    descriptionKey: "shortcutHelp",
    match: (e) => e.key === "F2",
  },
  {
    action: "nav.pos",
    label: "Ctrl+1",
    descriptionKey: "shortcutNavPos",
    match: (e) => isMod(e) && e.key === "1",
  },
  {
    action: "nav.products",
    label: "Ctrl+2",
    descriptionKey: "shortcutNavProducts",
    match: (e) => isMod(e) && e.key === "2",
  },
  {
    action: "nav.customers",
    label: "Ctrl+3",
    descriptionKey: "shortcutNavCustomers",
    match: (e) => isMod(e) && e.key === "3",
  },
  {
    action: "nav.history",
    label: "Ctrl+4",
    descriptionKey: "shortcutNavHistory",
    match: (e) => isMod(e) && e.key === "4",
  },
  {
    action: "nav.settings",
    label: "Ctrl+5",
    descriptionKey: "shortcutNavSettings",
    match: (e) => isMod(e) && e.key === "5",
  },
  {
    action: "focus.search",
    label: "/",
    descriptionKey: "shortcutFocusSearch",
    match: (e) =>
      e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e),
  },
  {
    action: "logout",
    label: "Ctrl+Shift+Q",
    descriptionKey: "shortcutLogout",
    match: (e) => isMod(e) && e.shiftKey && e.key.toLowerCase() === "q",
  },
];

export function isTypingTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

export type AppModule = "pos" | "products" | "customers" | "history" | "settings";

export const MODULE_ORDER: AppModule[] = [
  "pos",
  "products",
  "customers",
  "history",
  "settings",
];

export function moduleFromAction(action: ShortcutAction): AppModule | null {
  switch (action) {
    case "nav.pos":
      return "pos";
    case "nav.products":
      return "products";
    case "nav.customers":
      return "customers";
    case "nav.history":
      return "history";
    case "nav.settings":
      return "settings";
    default:
      return null;
  }
}
