import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  moduleFromHash,
  navigateModuleHash,
  syncModuleHash,
} from "./navigation/moduleRoute";
import { CustomersScreen } from "./screens/CustomersScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { PosScreen, type PosScreenHandle } from "./screens/PosScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AppShell } from "./shell/AppShell";
import { ShortcutsDocsScreen } from "./screens/ShortcutsDocsScreen";

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
  const [module, setModuleState] = useState<AppModule>(() => moduleFromHash());
  const [helpOpen, setHelpOpen] = useState(false);
  const posSearchRef = useRef<HTMLInputElement>(null);
  const posHandleRef = useRef<PosScreenHandle | null>(null);

  const setModule = useCallback((next: AppModule) => {
    setModuleState(next);
    navigateModuleHash(next);
  }, []);

  // Hash ↔ module (F5 / lien / retour navigateur)
  useEffect(() => {
    if (!window.location.hash) {
      syncModuleHash(moduleFromHash());
    }
    const onHashChange = () => {
      setModuleState(moduleFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

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
      "focus.cart": () => {
        setModule("pos");
        requestAnimationFrame(() => posHandleRef.current?.focusCart());
      },
      logout: () => {
        void logout();
      },
    };
  }, [logout, setModule]);

  // Sur la page doc, seul Esc/F2 (géré par ShortcutsDocsScreen) doit fermer.
  useGlobalShortcuts(shortcutHandlers, Boolean(user) && !helpOpen);

  const onNavigate = useCallback(
    (next: AppModule) => {
      setModule(next);
    },
    [setModule],
  );

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
  const companyName = user.entreprise?.nom ?? null;
  const branchName = user.branche?.nom ?? null;

  let content = null;
  switch (module) {
    case "pos":
      content = (
        <PosScreen
          locale={locale}
          currency={currency}
          companyName={companyName}
          branchName={branchName}
          searchRefExternal={posSearchRef}
          handleRef={posHandleRef}
        />
      );
      break;
    case "products":
      content = <ProductsScreen locale={locale} currency={currency} />;
      break;
    case "customers":
      content = <CustomersScreen locale={locale} currency={currency} />;
      break;
    case "history":
      content = (
        <HistoryScreen
          locale={locale}
          currency={currency}
          companyName={companyName}
          branchName={branchName}
        />
      );
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
    <AppShell
      locale={locale}
      onLocaleChange={(next) => void setLocale(next)}
      user={user}
      module={module}
      onNavigate={(next) => {
        setHelpOpen(false);
        onNavigate(next);
      }}
      onLogout={() => void logout()}
      onOpenHelp={() => setHelpOpen(true)}
    >
      {helpOpen ? (
        <ShortcutsDocsScreen locale={locale} onClose={() => setHelpOpen(false)} />
      ) : (
        content
      )}
    </AppShell>
  );
}
