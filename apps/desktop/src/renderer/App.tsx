import { useCallback, useMemo, useRef, useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { useAuth } from "./hooks/useAuth";
import { useUpdates } from "./hooks/useUpdates";
import {
  moduleFromAction,
  type AppModule,
  type ShortcutAction,
} from "./keyboard/shortcuts";
import { useGlobalShortcuts } from "./keyboard/useGlobalShortcuts";
import { t } from "./i18n/messages";
import { PlaceholderScreen } from "./screens/PlaceholderScreen";
import { PosScreen } from "./screens/PosScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AppShell } from "./shell/AppShell";
import { ShortcutHelp } from "./shell/ShortcutHelp";

export function App() {
  const {
    booting,
    user,
    session,
    profiles,
    bridgeError,
    locale,
    setLocale,
    login,
    logout,
    clearProfiles,
  } = useAuth();
  const updates = useUpdates(Boolean(user));
  const [module, setModule] = useState<AppModule>("pos");
  const [helpOpen, setHelpOpen] = useState(false);
  const posSearchRef = useRef<HTMLInputElement>(null);

  const shortcutHandlers = useMemo(() => {
    const navigate = (action: ShortcutAction) => {
      const next = moduleFromAction(action);
      if (next) setModule(next);
    };
    return {
      help: () => setHelpOpen((v) => !v),
      "nav.pos": () => navigate("nav.pos"),
      "nav.products": () => navigate("nav.products"),
      "nav.customers": () => navigate("nav.customers"),
      "nav.history": () => navigate("nav.history"),
      "nav.settings": () => navigate("nav.settings"),
      "focus.search": () => {
        setModule("pos");
        requestAnimationFrame(() => posSearchRef.current?.focus());
      },
      logout: () => {
        void logout();
      },
    };
  }, [logout]);

  useGlobalShortcuts(shortcutHandlers, Boolean(user) && !helpOpen);

  const onNavigate = useCallback((next: AppModule) => {
    setModule(next);
  }, []);

  if (booting) {
    return (
      <div
        style={{
          minHeight: "100%",
          display: "grid",
          placeItems: "center",
          color: "var(--tek-ash)",
        }}
      >
        {t(locale, "loading")}
      </div>
    );
  }

  if (bridgeError) {
    return (
      <div style={{ padding: 40, color: "var(--tek-danger)" }}>{bridgeError}</div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        locale={locale}
        onLocaleChange={(next) => void setLocale(next)}
        apiConfigured={session?.apiConfigured ?? false}
        profiles={profiles}
        onClearProfiles={clearProfiles}
        onLogin={login}
      />
    );
  }

  const currency = user.entreprise?.devise ?? null;

  let content = null;
  switch (module) {
    case "pos":
      content = (
        <PosScreen
          locale={locale}
          currency={currency}
          searchRefExternal={posSearchRef}
        />
      );
      break;
    case "products":
      content = <ProductsScreen locale={locale} currency={currency} />;
      break;
    case "customers":
      content = <PlaceholderScreen locale={locale} titleKey="customersTitle" />;
      break;
    case "history":
      content = <PlaceholderScreen locale={locale} titleKey="historyTitle" />;
      break;
    case "settings":
      content = (
        <SettingsScreen
          locale={locale}
          user={user}
          shell={updates.shell}
          packs={updates.packs}
          busy={updates.busy}
          onCheckUpdates={() => void updates.checkNow()}
          onInstallShell={() => void updates.installShell()}
          onRollback={(packId) => void updates.rollback(packId)}
        />
      );
      break;
  }

  return (
    <>
      <AppShell
        locale={locale}
        onLocaleChange={(next) => void setLocale(next)}
        user={user}
        module={module}
        onNavigate={onNavigate}
        onLogout={() => void logout()}
        onOpenHelp={() => setHelpOpen(true)}
      >
        {content}
      </AppShell>
      <ShortcutHelp
        locale={locale}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}
