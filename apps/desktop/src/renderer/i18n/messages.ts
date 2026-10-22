export type AppLocale = "fr" | "en";

export const messages = {
  fr: {
    loading: "Chargement…",
    appTag: "Application desktop",
    loginTitle: "Connexion",
    loginSubtitle: "Accède à ton espace TekaHub depuis le shell installé.",
    loginIdentifier: "Email ou numéro de téléphone",
    loginIdentifierPlaceholder: "user@mail.com ou +243…",
    password: "Mot de passe",
    passwordPlaceholder: "••••••••",
    signIn: "Se connecter",
    signingIn: "Connexion…",
    fillAllFields: "Veuillez remplir tous les champs",
    apiMissing: "API_BASE_URL n’est pas configurée dans .env",
    apiMissingHint: "Configure API_BASE_URL dans .env puis relance l’app.",
    loginError: "Erreur de connexion",
    chooseProfile: "Choisir un profil",
    chooseProfileHint:
      "Cet identifiant existe dans plusieurs organisations. Sélectionnez le profil à utiliser.",
    continueProfile: "Continuer avec ce profil",
    shellTag: "Shell desktop",
    logout: "Déconnexion",
    session: "Session",
    account: "Compte",
    role: "Rôle",
    api: "API",
    application: "Application",
    shellVersion: "Version shell",
    available: "Disponible",
    checkUpdates: "Vérifier les mises à jour",
    restartToApply: "Redémarrer pour appliquer",
    packs: "Packs dynamiques",
    packsEmpty:
      "Aucun pack actif. Configure PACKS_UPDATE_URL pour activer les téléchargements.",
    pack: "Pack",
    version: "Version",
    rollback: "Rollback",
    language: "Langue",
    navPos: "Caisse",
    navProducts: "Produits",
    navCustomers: "Clients",
    navHistory: "Historique",
    navSettings: "Paramètres",
    posTitle: "Caisse",
    posSearch: "Rechercher un produit",
    posSearchPlaceholder: "Nom, SKU ou code-barres",
    posCart: "Panier",
    posCartEmpty: "Aucun article",
    posCartItems: "article(s)",
    posCartIncrease: "Augmenter la quantité",
    posCartDecrease: "Diminuer la quantité",
    posCartRemove: "Retirer",
    posCartClear: "Vider",
    posCartValidate: "Valider",
    posCartTotal: "Total",
    posCartFocusHint: "F4 pour ouvrir le panier",
    posQtyEdit: "Quantité",
    posQtyHint: "↑↓ ou +/− : quantité · Entrée : valider · Esc : annuler · Suppr : retirer",
    posQtyConfirm: "Valider la quantité",
    posQtyCancel: "Annuler",
    productsTitle: "Produits",
    productsEmpty: "Aucun produit trouvé",
    productsRetry: "Réessayer",
    productsErrorNetworkChanged:
      "La connexion réseau a changé. Vérifiez Internet puis réessayez.",
    productsErrorOffline: "Pas de connexion Internet. Reconnectez-vous puis réessayez.",
    productsErrorTimeout: "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
    productsErrorDns: "Impossible de joindre le serveur. Vérifiez votre connexion.",
    productsErrorRefused: "Connexion au serveur refusée ou interrompue. Réessayez.",
    productsErrorGeneric: "Impossible de charger les produits. Réessayez.",
    stock: "Stock",
    customersTitle: "Clients",
    historyTitle: "Historique",
    settingsTitle: "Paramètres",
    modulePlaceholder: "Module en construction",
    shortcutHelpTitle: "Documentation clavier",
    shortcutHelpHint: "Inspiré des caisses type Odoo POS — magasin sans souris.",
    shortcutClose: "Fermer (Esc / F2)",
    shortcutHelp: "Ouvrir cette documentation",
    shortcutHelpDetail:
      "Ouvre ou ferme cette page d’aide. Disponible partout dans l’application une fois connecté.",
    shortcutNavPos: "Aller à la caisse",
    shortcutNavPosDetail: "Ouvre le module Caisse (POS) pour scanner et vendre.",
    shortcutNavProducts: "Aller aux produits",
    shortcutNavProductsDetail: "Ouvre le catalogue produits.",
    shortcutNavCustomers: "Aller aux clients",
    shortcutNavCustomersDetail: "Ouvre le module clients.",
    shortcutNavHistory: "Aller à l’historique",
    shortcutNavHistoryDetail: "Ouvre l’historique des ventes.",
    shortcutNavSettings: "Aller aux paramètres",
    shortcutNavSettingsDetail: "Ouvre les paramètres, la session et les mises à jour.",
    shortcutFocusSearch: "Focus recherche produit",
    shortcutFocusSearchDetail:
      "Place le curseur dans la recherche caisse (prêt pour un scan code-barres).",
    shortcutFocusCart: "Aller au panier",
    shortcutFocusCartDetail:
      "Focus sur le panier pour parcourir les lignes et modifier les quantités.",
    shortcutLogout: "Déconnexion",
    shortcutLogoutDetail: "Ferme la session et retourne à l’écran de connexion.",
    docsEyebrow: "Aide TekaHub",
    docsLead:
      "Tous les raccourcis de la caisse et de l’application. Cette page se met à jour automatiquement quand un raccourci est ajouté au code.",
    docsFooter:
      "Astuce : évitez F5 / F11 / F12 (réservés au système). Sur macOS, Ctrl peut être remplacé par ⌘.",
    docsGroupApp: "Application",
    docsGroupAppIntro: "Raccourcis globaux disponibles dans tout le shell desktop.",
    docsGroupNav: "Navigation modules",
    docsGroupNavIntro: "Changer de module sans souris.",
    docsGroupPosSearch: "Caisse — recherche & scan",
    docsGroupPosSearchIntro:
      "Le champ recherche est autofocus. Ideal pour un clavier thermique / scanner.",
    docsGroupPosProducts: "Caisse — liste produits",
    docsGroupPosProductsIntro:
      "Après une recherche, naviguez dans la grille puis ajoutez au panier.",
    docsGroupPosCart: "Caisse — panier",
    docsGroupPosCartIntro: "Sélectionnez une ligne pour ajuster la quantité.",
    docsGroupPosQty: "Caisse — modal quantité",
    docsGroupPosQtyIntro: "Ajustez puis validez la quantité d’une ligne panier.",
    docsPosSearchEnter: "Valider la recherche / scan",
    docsPosSearchEnterDetail:
      "Code-barres ou SKU exact → ajoute au panier. Sinon → focus sur la liste filtrée. Un seul résultat → ajout direct.",
    docsPosSearchArrow: "Aller à la liste produits",
    docsPosSearchArrowDetail: "Passe le focus sur la grille produits filtrés.",
    docsPosSearchEsc: "Effacer la recherche",
    docsPosSearchEscDetail: "Vide le champ de recherche sans quitter la caisse.",
    docsPosProductsArrows: "Parcourir les produits",
    docsPosProductsArrowsDetail:
      "Déplace la sélection dans la grille. → en fin de ligne peut ouvrir le panier.",
    docsPosProductsEnter: "Ajouter au panier",
    docsPosProductsEnterDetail: "Ajoute le produit surligné (quantité +1) et revient à la recherche.",
    docsPosProductsTab: "Valider / Vider le panier",
    docsPosProductsTabDetail:
      "Tab depuis la recherche : Valider puis Vider. La grille produits est hors tabulation (scanner).",
    docsPosProductsEsc: "Retour recherche",
    docsPosProductsEscDetail: "Quitte la grille et replace le focus sur la recherche.",
    docsPosCartArrows: "Parcourir les lignes",
    docsPosCartArrowsDetail: "Sélectionne la ligne panier précédente / suivante.",
    docsPosCartEnter: "Modifier la quantité",
    docsPosCartEnterDetail: "Ouvre le modal de quantité pour la ligne sélectionnée.",
    docsPosCartDelete: "Retirer la ligne",
    docsPosCartDeleteDetail: "Supprime immédiatement la ligne sélectionnée du panier.",
    docsPosCartEsc: "Retour recherche",
    docsPosCartEscDetail: "Quitte le focus panier et revient à la recherche produit.",
    docsPosQtyArrows: "Changer la quantité",
    docsPosQtyArrowsDetail: "Augmente ou diminue la quantité (minimum 1).",
    docsPosQtyEnter: "Valider la quantité",
    docsPosQtyEnterDetail: "Enregistre la quantité et referme le modal.",
    docsPosQtyDelete: "Retirer du panier",
    docsPosQtyDeleteDetail: "Supprime la ligne et ferme le modal.",
    docsPosQtyEsc: "Annuler",
    docsPosQtyEscDetail: "Ferme le modal sans appliquer les changements de quantité.",
    statusShortcuts: "F2 aide · F4 panier · Ctrl+1–5 · / recherche",
    statusReady: "Prêt",
  },
  en: {
    loading: "Loading…",
    appTag: "Desktop application",
    loginTitle: "Sign in",
    loginSubtitle: "Access your TekaHub workspace from the installed shell.",
    loginIdentifier: "Email or phone number",
    loginIdentifierPlaceholder: "user@mail.com or +243…",
    password: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Sign in",
    signingIn: "Signing in…",
    fillAllFields: "Please fill in all fields",
    apiMissing: "API_BASE_URL is not configured in .env",
    apiMissingHint: "Set API_BASE_URL in .env then restart the app.",
    loginError: "Sign-in failed",
    chooseProfile: "Choose a profile",
    chooseProfileHint:
      "This identifier belongs to multiple organizations. Select the profile to use.",
    continueProfile: "Continue with this profile",
    shellTag: "Desktop shell",
    logout: "Sign out",
    session: "Session",
    account: "Account",
    role: "Role",
    api: "API",
    application: "Application",
    shellVersion: "Shell version",
    available: "Available",
    checkUpdates: "Check for updates",
    restartToApply: "Restart to apply",
    packs: "Dynamic packs",
    packsEmpty: "No active pack. Set PACKS_UPDATE_URL to enable downloads.",
    pack: "Pack",
    version: "Version",
    rollback: "Rollback",
    language: "Language",
    navPos: "POS",
    navProducts: "Products",
    navCustomers: "Customers",
    navHistory: "History",
    navSettings: "Settings",
    posTitle: "POS",
    posSearch: "Search product",
    posSearchPlaceholder: "Name, SKU or barcode",
    posCart: "Cart",
    posCartEmpty: "No items",
    posCartItems: "item(s)",
    posCartIncrease: "Increase quantity",
    posCartDecrease: "Decrease quantity",
    posCartRemove: "Remove",
    posCartClear: "Clear",
    posCartValidate: "Validate",
    posCartTotal: "Total",
    posCartFocusHint: "F4 to focus the cart",
    posQtyEdit: "Quantity",
    posQtyHint: "↑↓ or +/− : quantity · Enter : confirm · Esc : cancel · Del : remove",
    posQtyConfirm: "Confirm quantity",
    posQtyCancel: "Cancel",
    productsTitle: "Products",
    productsEmpty: "No products found",
    productsRetry: "Retry",
    productsErrorNetworkChanged:
      "The network connection changed. Check Internet, then try again.",
    productsErrorOffline: "No Internet connection. Reconnect, then try again.",
    productsErrorTimeout: "The server is taking too long to respond. Try again shortly.",
    productsErrorDns: "Could not reach the server. Check your connection.",
    productsErrorRefused: "Connection to the server was refused or dropped. Try again.",
    productsErrorGeneric: "Could not load products. Please try again.",
    stock: "Stock",
    customersTitle: "Customers",
    historyTitle: "History",
    settingsTitle: "Settings",
    modulePlaceholder: "Module under construction",
    shortcutHelpTitle: "Keyboard documentation",
    shortcutHelpHint: "Inspired by Odoo-style POS — store use without a mouse.",
    shortcutClose: "Close (Esc / F2)",
    shortcutHelp: "Open this documentation",
    shortcutHelpDetail:
      "Opens or closes this help page. Available anywhere in the app once signed in.",
    shortcutNavPos: "Go to POS",
    shortcutNavPosDetail: "Opens the POS (cash register) module to scan and sell.",
    shortcutNavProducts: "Go to products",
    shortcutNavProductsDetail: "Opens the product catalog.",
    shortcutNavCustomers: "Go to customers",
    shortcutNavCustomersDetail: "Opens the customers module.",
    shortcutNavHistory: "Go to history",
    shortcutNavHistoryDetail: "Opens the sales history.",
    shortcutNavSettings: "Go to settings",
    shortcutNavSettingsDetail: "Opens settings, session, and updates.",
    shortcutFocusSearch: "Focus product search",
    shortcutFocusSearchDetail:
      "Moves focus to the POS search field (ready for a barcode scan).",
    shortcutFocusCart: "Go to cart",
    shortcutFocusCartDetail: "Focuses the cart to browse lines and edit quantities.",
    shortcutLogout: "Sign out",
    shortcutLogoutDetail: "Ends the session and returns to the sign-in screen.",
    docsEyebrow: "TekaHub help",
    docsLead:
      "All cash-register and app shortcuts. This page updates automatically when a shortcut is added in code.",
    docsFooter:
      "Tip: avoid F5 / F11 / F12 (system reserved). On macOS, Ctrl may be ⌘.",
    docsGroupApp: "Application",
    docsGroupAppIntro: "Global shortcuts available across the desktop shell.",
    docsGroupNav: "Module navigation",
    docsGroupNavIntro: "Switch modules without a mouse.",
    docsGroupPosSearch: "POS — search & scan",
    docsGroupPosSearchIntro: "Search is autofocused. Built for a thermal keyboard / scanner.",
    docsGroupPosProducts: "POS — product list",
    docsGroupPosProductsIntro: "After searching, browse the grid then add to cart.",
    docsGroupPosCart: "POS — cart",
    docsGroupPosCartIntro: "Select a line to adjust its quantity.",
    docsGroupPosQty: "POS — quantity modal",
    docsGroupPosQtyIntro: "Adjust then confirm a cart line quantity.",
    docsPosSearchEnter: "Confirm search / scan",
    docsPosSearchEnterDetail:
      "Exact barcode or SKU → add to cart. Otherwise → focus the filtered list. Single result → add immediately.",
    docsPosSearchArrow: "Go to product list",
    docsPosSearchArrowDetail: "Moves focus to the filtered product grid.",
    docsPosSearchEsc: "Clear search",
    docsPosSearchEscDetail: "Clears the search field without leaving POS.",
    docsPosProductsArrows: "Browse products",
    docsPosProductsArrowsDetail:
      "Moves the highlight in the grid. → at end of a row can open the cart.",
    docsPosProductsEnter: "Add to cart",
    docsPosProductsEnterDetail: "Adds the highlighted product (+1) and returns to search.",
    docsPosProductsTab: "Validate / Clear cart",
    docsPosProductsTabDetail:
      "Tab from search: Validate then Clear. Product grid is out of tab order (scanner flow).",
    docsPosProductsEsc: "Back to search",
    docsPosProductsEscDetail: "Leaves the grid and focuses search again.",
    docsPosCartArrows: "Browse cart lines",
    docsPosCartArrowsDetail: "Selects the previous / next cart line.",
    docsPosCartEnter: "Edit quantity",
    docsPosCartEnterDetail: "Opens the quantity modal for the selected line.",
    docsPosCartDelete: "Remove line",
    docsPosCartDeleteDetail: "Immediately removes the selected line from the cart.",
    docsPosCartEsc: "Back to search",
    docsPosCartEscDetail: "Leaves cart focus and returns to product search.",
    docsPosQtyArrows: "Change quantity",
    docsPosQtyArrowsDetail: "Increases or decreases quantity (minimum 1).",
    docsPosQtyEnter: "Confirm quantity",
    docsPosQtyEnterDetail: "Saves the quantity and closes the modal.",
    docsPosQtyDelete: "Remove from cart",
    docsPosQtyDeleteDetail: "Deletes the line and closes the modal.",
    docsPosQtyEsc: "Cancel",
    docsPosQtyEscDetail: "Closes the modal without applying quantity changes.",
    statusShortcuts: "F2 help · F4 cart · Ctrl+1–5 · / search",
    statusReady: "Ready",
  },
} as const;

export type MessageKey = keyof (typeof messages)["fr"];

export function t(locale: AppLocale, key: MessageKey): string {
  return messages[locale][key] ?? messages.fr[key];
}

export function normalizeLocale(value?: string | null): AppLocale {
  const raw = (value ?? "").toLowerCase();
  if (raw.startsWith("en")) return "en";
  return "fr";
}

/** Transforme erreurs IPC / net::ERR_* en message utilisateur. */
export function friendlyProductsError(locale: AppLocale, err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const text = raw.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/i, "");

  const codeMatch = text.match(/TEKA_NET:([A-Z_]+)/i);
  const code = (codeMatch?.[1] ?? "").toUpperCase();

  if (code === "NETWORK_CHANGED" || /ERR_NETWORK_CHANGED|NETWORK_CHANGED/i.test(text)) {
    return t(locale, "productsErrorNetworkChanged");
  }
  if (code === "OFFLINE" || /ERR_INTERNET_DISCONNECTED|ENETUNREACH/i.test(text)) {
    return t(locale, "productsErrorOffline");
  }
  if (
    code === "TIMEOUT" ||
    /timeout|TIMED_OUT|ConnectTimeout|ETIMEDOUT|ERR_CONNECTION_TIMED_OUT/i.test(text)
  ) {
    return t(locale, "productsErrorTimeout");
  }
  if (code === "DNS" || /ENOTFOUND|ERR_NAME_NOT_RESOLVED|getaddrinfo/i.test(text)) {
    return t(locale, "productsErrorDns");
  }
  if (
    code === "REFUSED" ||
    /ECONNREFUSED|ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED/i.test(text)
  ) {
    return t(locale, "productsErrorRefused");
  }
  if (code === "GENERIC" || /fetch failed|net::ERR_|TEKA_NET:/i.test(text)) {
    return t(locale, "productsErrorGeneric");
  }

  if (/TEKA_AUTH:UNAUTHENTICATED|Unauthenticated/i.test(text)) {
    return t(locale, "productsErrorGeneric");
  }

  // Message API métier déjà lisible — sinon générique.
  if (text && !/Error invoking|at async |node:|undici/i.test(text) && text.length < 160) {
    return text;
  }
  return t(locale, "productsErrorGeneric");
}
