import type { CSSProperties, ReactNode } from "react";
import type { AppLocale, AuthUser, OfflineQueueState } from "@teka/shared";
import type { AppModule } from "../keyboard/shortcuts";
import { t } from "../i18n/messages";
import { LanguageSwitch } from "../components/LanguageSwitch";
import logo from "../assets/teka-hub-logo.svg";

const NAV: {
  id: AppModule;
  labelKey:
    | "navPos"
    | "navProducts"
    | "navCustomers"
    | "navHistory"
    | "navReport"
    | "navSettings";
  kbd: string;
}[] = [
  { id: "pos", labelKey: "navPos", kbd: "Ctrl+1" },
  { id: "products", labelKey: "navProducts", kbd: "Ctrl+2" },
  { id: "customers", labelKey: "navCustomers", kbd: "Ctrl+3" },
  { id: "history", labelKey: "navHistory", kbd: "Ctrl+4" },
  { id: "report", labelKey: "navReport", kbd: "Ctrl+5" },
  { id: "settings", labelKey: "navSettings", kbd: "Ctrl+6" },
];

type Props = {
  locale: AppLocale;
  onLocaleChange: (locale: AppLocale) => void;
  user: AuthUser;
  module: AppModule;
  onNavigate: (module: AppModule) => void;
  onLogout: () => void;
  onOpenHelp: () => void;
  online?: boolean;
  offlineQueue?: OfflineQueueState | null;
  onFlushQueue?: () => void;
  children: ReactNode;
};

export function AppShell({
  locale,
  onLocaleChange,
  user,
  module,
  onNavigate,
  onLogout,
  onOpenHelp,
  online = true,
  offlineQueue = null,
  onFlushQueue,
  children,
}: Props) {
  const displayName = [user.prenom, user.name].filter(Boolean).join(" ") || user.email;
  const pending = offlineQueue?.pending ?? 0;

  return (
    <div className="tek-shell">
      <a className="tek-skip-link" href="#tek-main">
        Skip to content
      </a>

      <header className="tek-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="TekaHub" style={{ height: 32 }} />
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--tek-ash)",
              }}
            >
              {t(locale, "shellTag")}
            </div>
            <strong style={{ fontSize: 15 }}>{displayName}</strong>
          </div>
        </div>
        <div className="tek-topbar-actions">
          <LanguageSwitch locale={locale} onChange={onLocaleChange} />
          <button
            type="button"
            onClick={onOpenHelp}
            title="F2"
            style={ghostBtn}
          >
            <span className="tek-kbd">F2</span>
          </button>
          <button type="button" onClick={onLogout} style={ghostBtn}>
            {t(locale, "logout")}
          </button>
        </div>
      </header>

      <div className="tek-shell-body">
        <nav className="tek-nav" aria-label="Main">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tek-nav-item"
              aria-current={module === item.id ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span>{t(locale, item.labelKey)}</span>
              <span className="tek-nav-kbd">{item.kbd}</span>
            </button>
          ))}
        </nav>

        <main id="tek-main" className="tek-main" tabIndex={-1}>
          {children}
        </main>
      </div>

      <footer className="tek-statusbar">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              color: online ? "#15803d" : "var(--tek-danger)",
              fontWeight: 700,
            }}
          >
            {online ? t(locale, "statusOnline") : t(locale, "statusOffline")}
          </span>
          {pending > 0 ? (
            <button
              type="button"
              onClick={onFlushQueue}
              disabled={offlineQueue?.flushing}
              style={{
                border: "1px solid var(--tek-line)",
                borderRadius: 999,
                padding: "4px 10px",
                background: "rgba(244, 198, 15, 0.35)",
                color: "var(--tek-black)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
              title={t(locale, "statusQueueHint")}
            >
              {offlineQueue?.flushing
                ? t(locale, "statusQueueSyncing")
                : t(locale, "statusQueuePending").replace("{n}", String(pending))}
            </button>
          ) : (
            <span>{t(locale, "statusReady")}</span>
          )}
        </span>
        <span>{t(locale, "statusShortcuts")}</span>
      </footer>
    </div>
  );
}

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ink)",
  padding: "7px 12px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 13,
};
