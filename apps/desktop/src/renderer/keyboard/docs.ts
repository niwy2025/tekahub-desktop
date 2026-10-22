import type { MessageKey } from "../i18n/messages";
import { SHORTCUTS, type ShortcutAction } from "./shortcuts";

/**
 * Documentation clavier — source unique pour la page F2.
 *
 * Évolution :
 * 1. Ajouter le raccourci dans SHORTCUTS (handlers globaux)
 * 2. Renseigner SHORTCUT_DOC_META (détail + groupe)
 * 3. Pour un geste contextuel (POS sans handler global) : ajouter dans CONTEXT_DOCS
 *
 * La page F2 lit buildShortcutDocumentation() — rien à dupliquer dans l’UI.
 */

export type DocGroupId =
  | "app"
  | "navigation"
  | "pos-search"
  | "pos-products"
  | "pos-cart"
  | "pos-qty";

export type ShortcutDocEntry = {
  id: string;
  keys: string[];
  titleKey: MessageKey;
  detailKey: MessageKey;
  group: DocGroupId;
};

export type ShortcutDocSection = {
  id: DocGroupId;
  titleKey: MessageKey;
  introKey: MessageKey;
  entries: ShortcutDocEntry[];
};

/** Métadonnées d’aide pour chaque action de SHORTCUTS */
export const SHORTCUT_DOC_META: Record<
  ShortcutAction,
  { detailKey: MessageKey; group: DocGroupId }
> = {
  help: { detailKey: "shortcutHelpDetail", group: "app" },
  "nav.pos": { detailKey: "shortcutNavPosDetail", group: "navigation" },
  "nav.products": { detailKey: "shortcutNavProductsDetail", group: "navigation" },
  "nav.customers": { detailKey: "shortcutNavCustomersDetail", group: "navigation" },
  "nav.history": { detailKey: "shortcutNavHistoryDetail", group: "navigation" },
  "nav.settings": { detailKey: "shortcutNavSettingsDetail", group: "navigation" },
  "focus.search": { detailKey: "shortcutFocusSearchDetail", group: "pos-search" },
  "focus.cart": { detailKey: "shortcutFocusCartDetail", group: "pos-cart" },
  logout: { detailKey: "shortcutLogoutDetail", group: "app" },
};

/** Ordre et titres des sections sur la page F2 */
export const DOC_GROUP_ORDER: {
  id: DocGroupId;
  titleKey: MessageKey;
  introKey: MessageKey;
}[] = [
  { id: "app", titleKey: "docsGroupApp", introKey: "docsGroupAppIntro" },
  { id: "navigation", titleKey: "docsGroupNav", introKey: "docsGroupNavIntro" },
  { id: "pos-search", titleKey: "docsGroupPosSearch", introKey: "docsGroupPosSearchIntro" },
  {
    id: "pos-products",
    titleKey: "docsGroupPosProducts",
    introKey: "docsGroupPosProductsIntro",
  },
  { id: "pos-cart", titleKey: "docsGroupPosCart", introKey: "docsGroupPosCartIntro" },
  { id: "pos-qty", titleKey: "docsGroupPosQty", introKey: "docsGroupPosQtyIntro" },
];

/**
 * Gestes contextuels POS (pas dans SHORTCUTS / handlers globaux).
 * Ajoute ici chaque nouveau comportement clavier local à la caisse.
 */
export const CONTEXT_DOCS: ShortcutDocEntry[] = [
  {
    id: "pos.search.enter",
    keys: ["Enter"],
    titleKey: "docsPosSearchEnter",
    detailKey: "docsPosSearchEnterDetail",
    group: "pos-search",
  },
  {
    id: "pos.search.arrowdown",
    keys: ["↓"],
    titleKey: "docsPosSearchArrow",
    detailKey: "docsPosSearchArrowDetail",
    group: "pos-search",
  },
  {
    id: "pos.search.esc",
    keys: ["Esc"],
    titleKey: "docsPosSearchEsc",
    detailKey: "docsPosSearchEscDetail",
    group: "pos-search",
  },
  {
    id: "pos.products.arrows",
    keys: ["↑", "↓", "←", "→"],
    titleKey: "docsPosProductsArrows",
    detailKey: "docsPosProductsArrowsDetail",
    group: "pos-products",
  },
  {
    id: "pos.products.enter",
    keys: ["Enter"],
    titleKey: "docsPosProductsEnter",
    detailKey: "docsPosProductsEnterDetail",
    group: "pos-products",
  },
  {
    id: "pos.products.tab",
    keys: ["Tab"],
    titleKey: "docsPosProductsTab",
    detailKey: "docsPosProductsTabDetail",
    group: "pos-products",
  },
  {
    id: "pos.products.esc",
    keys: ["Esc"],
    titleKey: "docsPosProductsEsc",
    detailKey: "docsPosProductsEscDetail",
    group: "pos-products",
  },
  {
    id: "pos.cart.arrows",
    keys: ["↑", "↓"],
    titleKey: "docsPosCartArrows",
    detailKey: "docsPosCartArrowsDetail",
    group: "pos-cart",
  },
  {
    id: "pos.cart.enter",
    keys: ["Enter"],
    titleKey: "docsPosCartEnter",
    detailKey: "docsPosCartEnterDetail",
    group: "pos-cart",
  },
  {
    id: "pos.cart.delete",
    keys: ["Del"],
    titleKey: "docsPosCartDelete",
    detailKey: "docsPosCartDeleteDetail",
    group: "pos-cart",
  },
  {
    id: "pos.cart.esc",
    keys: ["Esc"],
    titleKey: "docsPosCartEsc",
    detailKey: "docsPosCartEscDetail",
    group: "pos-cart",
  },
  {
    id: "pos.qty.arrows",
    keys: ["↑", "↓", "+", "−"],
    titleKey: "docsPosQtyArrows",
    detailKey: "docsPosQtyArrowsDetail",
    group: "pos-qty",
  },
  {
    id: "pos.qty.enter",
    keys: ["Enter"],
    titleKey: "docsPosQtyEnter",
    detailKey: "docsPosQtyEnterDetail",
    group: "pos-qty",
  },
  {
    id: "pos.qty.delete",
    keys: ["Del"],
    titleKey: "docsPosQtyDelete",
    detailKey: "docsPosQtyDeleteDetail",
    group: "pos-qty",
  },
  {
    id: "pos.qty.esc",
    keys: ["Esc"],
    titleKey: "docsPosQtyEsc",
    detailKey: "docsPosQtyEscDetail",
    group: "pos-qty",
  },
];

function docsFromGlobalShortcuts(): ShortcutDocEntry[] {
  return SHORTCUTS.map((s) => {
    const meta = SHORTCUT_DOC_META[s.action];
    return {
      id: s.action,
      keys: [s.label],
      titleKey: s.descriptionKey,
      detailKey: meta.detailKey,
      group: meta.group,
    };
  });
}

/** Sections prêtes pour la page F2 — se met à jour avec SHORTCUTS + CONTEXT_DOCS. */
export function buildShortcutDocumentation(): ShortcutDocSection[] {
  const all = [...docsFromGlobalShortcuts(), ...CONTEXT_DOCS];
  return DOC_GROUP_ORDER.map((group) => ({
    id: group.id,
    titleKey: group.titleKey,
    introKey: group.introKey,
    entries: all.filter((entry) => entry.group === group.id),
  })).filter((section) => section.entries.length > 0);
}
