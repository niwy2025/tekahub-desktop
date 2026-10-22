import { useCallback, useEffect, useState } from "react";
import type {
  AppLocale,
  AuthSelectableProfile,
  AuthUser,
  SessionInfo,
} from "@teka/shared";
import { clearClients, ensureClientsLoaded } from "../catalog/clientCatalogStore";
import { clearCatalog, ensureCatalogLoaded } from "../catalog/productCatalogStore";
import { normalizeLocale } from "../i18n/messages";

function preloadOfflineCaches(locale: AppLocale) {
  void ensureCatalogLoaded(locale);
  void ensureClientsLoaded(locale);
}

function clearOfflineCaches() {
  clearCatalog();
  clearClients();
}

export function useAuth() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [profiles, setProfiles] = useState<AuthSelectableProfile[]>([]);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<AppLocale>("fr");

  useEffect(() => {
    if (!window.teka) {
      setBridgeError("Bridge Electron indisponible (preload).");
      setBooting(false);
      return;
    }

    void window.teka
      .getSession()
      .then(async ({ session: nextSession, user: nextUser, locale: nextLocale }) => {
        const nextLocaleNorm = normalizeLocale(nextLocale.locale);
        setSession(nextSession);
        setUser(nextUser);
        setLocaleState(nextLocaleNorm);
        if (nextUser) {
          preloadOfflineCaches(nextLocaleNorm);
        }
      })
      .catch((err) => {
        setBridgeError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setBooting(false));
  }, []);

  // 401 réel en cours d’usage → retour login (token déjà purgé côté main)
  useEffect(() => {
    if (!window.teka?.onSessionExpired) return;
    return window.teka.onSessionExpired(() => {
      clearOfflineCaches();
      setUser(null);
      setProfiles([]);
      setSession((prev) =>
        prev
          ? { ...prev, authenticated: false }
          : { authenticated: false, apiConfigured: false, apiBaseUrl: null },
      );
    });
  }, []);

  const login = useCallback(
    async (loginId: string, password: string, userId?: string) => {
      const result = await window.teka.login(loginId, password, userId);
      if (result.status === "profile_selection") {
        setProfiles(result.profiles);
        return "profiles" as const;
      }
      setProfiles([]);
      setUser(result.user);
      setSession({
        authenticated: true,
        apiConfigured: session?.apiConfigured ?? true,
        apiBaseUrl: session?.apiBaseUrl ?? null,
      });
      preloadOfflineCaches(locale);
      return "ok" as const;
    },
    [locale, session?.apiBaseUrl, session?.apiConfigured],
  );

  const logout = useCallback(async () => {
    clearOfflineCaches();
    await window.teka.logout();
    setUser(null);
    setProfiles([]);
    setSession((prev) =>
      prev
        ? { ...prev, authenticated: false }
        : { authenticated: false, apiConfigured: false, apiBaseUrl: null },
    );
  }, []);

  const setLocale = useCallback(async (next: AppLocale) => {
    const info = await window.teka.setLocale(next);
    setLocaleState(normalizeLocale(info.locale));
  }, []);

  return {
    booting,
    user,
    session,
    profiles,
    bridgeError,
    locale,
    setLocale,
    login,
    logout,
    clearProfiles: () => setProfiles([]),
  };
}
