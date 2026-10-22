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
    shortcutHelpTitle: "Raccourcis clavier",
    shortcutHelpHint: "Inspiré des caisses type Odoo POS — magasin sans souris.",
    shortcutClose: "Fermer (Esc)",
    shortcutHelp: "Afficher cette aide",
    shortcutNavPos: "Aller à la caisse",
    shortcutNavProducts: "Aller aux produits",
    shortcutNavCustomers: "Aller aux clients",
    shortcutNavHistory: "Aller à l’historique",
    shortcutNavSettings: "Aller aux paramètres",
    shortcutFocusSearch: "Focus recherche produit",
    shortcutFocusCart: "Aller au panier (lignes + quantité)",
    shortcutLogout: "Déconnexion",
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
    shortcutHelpTitle: "Keyboard shortcuts",
    shortcutHelpHint: "Inspired by Odoo-style POS — store use without a mouse.",
    shortcutClose: "Close (Esc)",
    shortcutHelp: "Show this help",
    shortcutNavPos: "Go to POS",
    shortcutNavProducts: "Go to products",
    shortcutNavCustomers: "Go to customers",
    shortcutNavHistory: "Go to history",
    shortcutNavSettings: "Go to settings",
    shortcutFocusSearch: "Focus product search",
    shortcutFocusCart: "Go to cart (lines + quantity)",
    shortcutLogout: "Sign out",
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

  // Message API métier déjà lisible (ex. Unauthenticated) — sinon générique.
  if (text && !/Error invoking|at async |node:|undici/i.test(text) && text.length < 160) {
    return text;
  }
  return t(locale, "productsErrorGeneric");
}
