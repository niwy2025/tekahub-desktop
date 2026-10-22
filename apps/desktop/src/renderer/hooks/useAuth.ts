import { useCallback, useEffect, useState } from "react";
import type {
  AppLocale,
  AuthSelectableProfile,
  AuthUser,
  SessionInfo,
} from "@teka/shared";
import { normalizeLocale } from "../i18n/messages";

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
      .then(({ session: nextSession, user: nextUser, locale: nextLocale }) => {
        setSession(nextSession);
        setUser(nextUser);
        setLocaleState(normalizeLocale(nextLocale.locale));
      })
      .catch((err) => {
        setBridgeError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setBooting(false));
  }, []);

  // Token invalide / Unauthenticated → retour écran login
  useEffect(() => {
    if (!window.teka?.onSessionExpired) return;
    return window.teka.onSessionExpired(() => {
      setUser(null);
      setProfiles([]);
      setSession((prev) =>
        prev
          ? { ...prev, authenticated: false }
          : { authenticated: false, apiConfigured: false, apiBaseUrl: null },
      );
      void window.teka.logout().catch(() => {
        // token déjà purgé côté main
      });
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
      return "ok" as const;
    },
    [session?.apiBaseUrl, session?.apiConfigured],
  );

  const logout = useCallback(async () => {
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
