import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type {
  AppLocale,
  AuthUser,
  ConnectionSettingsView,
  PackUpdateState,
  PrinterInfo,
  PrinterSettings,
  ShellUpdateState,
} from "@teka/shared";
import { StatusBadge } from "../components/StatusBadge";
import { t } from "../i18n/messages";

type Props = {
  locale: AppLocale;
  user: AuthUser;
  shell: ShellUpdateState;
  packs: PackUpdateState[];
  busy: boolean;
  onCheckUpdates: () => void;
  onInstallShell: () => void;
  onRollback: (packId: string) => void;
};

export function SettingsScreen({
  locale,
  user,
  shell,
  packs,
  busy,
  onCheckUpdates,
  onInstallShell,
  onRollback,
}: Props) {
  return (
    <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, "settingsTitle")}</h1>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <Panel title={t(locale, "session")}>
          <Row label={t(locale, "account")} value={user.email} />
          <Row
            label={t(locale, "role")}
            value={user.type_utilisateur ?? user.roles?.[0] ?? "—"}
          />
        </Panel>

        <Panel title={t(locale, "application")}>
          <Row label={t(locale, "updateCurrentVersion")} value={shell.currentVersion} />
          {shell.availableVersion ? (
            <Row label={t(locale, "available")} value={shell.availableVersion} />
          ) : null}
          <div style={{ marginTop: 14 }}>
            <StatusBadge
              status={shell.status}
              message={shell.message}
              progress={shell.progress}
            />
          </div>
          {shell.error ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                color: "var(--tek-danger)",
                wordBreak: "break-word",
              }}
            >
              {shell.error}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button type="button" onClick={onCheckUpdates} disabled={busy} style={ghostBtn}>
              {t(locale, "checkUpdates")}
            </button>
            {shell.status === "ready" ? (
              <button type="button" onClick={onInstallShell} style={primaryBtn}>
                {t(locale, "restartToApply")}
              </button>
            ) : null}
          </div>
        </Panel>

        <Panel title={t(locale, "packs")}>
          {packs.length === 0 ? (
            <p style={{ margin: 0, color: "var(--tek-ash)", fontSize: 14 }}>
              {t(locale, "packsEmpty")}
            </p>
          ) : (
            packs.map((p) => (
              <div key={p.packId} style={{ marginBottom: 14 }}>
                <Row label={t(locale, "pack")} value={p.packId} />
                <Row label={t(locale, "version")} value={p.currentVersion ?? "—"} />
                <div style={{ marginTop: 10 }}>
                  <StatusBadge
                    status={p.status}
                    message={p.message}
                    progress={p.progress}
                  />
                </div>
                <button
                  type="button"
                  style={{ ...ghostBtn, marginTop: 10 }}
                  disabled={busy}
                  onClick={() => onRollback(p.packId)}
                >
                  {t(locale, "rollback")}
                </button>
              </div>
            ))
          )}
        </Panel>

        <ConnectionPanel locale={locale} />
        <PrinterPanel locale={locale} />
      </section>
    </div>
  );
}

function ConnectionPanel({ locale }: { locale: AppLocale }) {
  const [view, setView] = useState<ConnectionSettingsView | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      if (typeof window.teka?.getConnectionSettings !== "function") {
        setError(t(locale, "printerBridgeStale"));
        setView(null);
        return;
      }
      const next = await window.teka.getConnectionSettings();
      setView(next);
      setDraft(next.apiBaseUrl ?? next.effectiveApiBaseUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "connectionLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [locale]);

  async function save(url: string | null) {
    if (saving) return;
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const next = await window.teka.setConnectionSettings({ apiBaseUrl: url });
      setView(next);
      setDraft(next.apiBaseUrl ?? next.effectiveApiBaseUrl);
      setSavedMsg(t(locale, "connectionSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={t(locale, "connectionSection")}>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--tek-ash)", lineHeight: 1.45 }}>
        {t(locale, "connectionHint")}
      </p>

      {loading || !view ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--tek-ash)" }}>
          {t(locale, "loading")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {view.fromEnv ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--tek-ash)", lineHeight: 1.45 }}>
              {t(locale, "connectionEnvOverride")}
            </p>
          ) : null}

          <label style={selectLabel}>
            {t(locale, "connectionApiUrl")}
            <input
              type="url"
              value={draft}
              disabled={saving || view.fromEnv}
              placeholder={t(locale, "connectionApiPlaceholder")}
              onChange={(e) => setDraft(e.target.value)}
              style={selectInput}
            />
          </label>

          <Row label={t(locale, "api")} value={view.effectiveApiBaseUrl} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={primaryBtn}
              disabled={saving || view.fromEnv || !draft.trim()}
              onClick={() => void save(draft.trim())}
            >
              {t(locale, "connectionSave")}
            </button>
            <button
              type="button"
              style={ghostBtn}
              disabled={saving || view.fromEnv}
              onClick={() => void save(view.defaultApiBaseUrl)}
            >
              {t(locale, "connectionResetDefault")}
            </button>
          </div>
        </div>
      )}

      {savedMsg ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#15803d" }}>{savedMsg}</p>
      ) : null}
      {error ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--tek-danger)" }}>{error}</p>
      ) : null}
    </Panel>
  );
}

function PrinterPanel({ locale }: { locale: AppLocale }) {
  const [settings, setSettings] = useState<PrinterSettings | null>(null);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function load(refreshPrinters = true) {
    setLoading(true);
    setError(null);
    try {
      if (typeof window.teka?.getPrinterSettings !== "function") {
        setError(t(locale, "printerBridgeStale"));
        setSettings(null);
        return;
      }
      const next = await window.teka.getPrinterSettings();
      setSettings(next);
      if (refreshPrinters && typeof window.teka.listPrinters === "function") {
        const list = await window.teka.listPrinters();
        setPrinters(list);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "printerLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [locale]);

  async function persist(patch: Partial<PrinterSettings>) {
    if (!settings || saving) return;
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    try {
      const next = await window.teka.setPrinterSettings(patch);
      setSettings(next);
      setSavedMsg(t(locale, "printerSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title={t(locale, "printerSection")}>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--tek-ash)", lineHeight: 1.45 }}>
        {t(locale, "printerHint")}
      </p>

      {loading || !settings ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--tek-ash)" }}>
          {t(locale, "loading")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={checkRow}>
            <input
              type="checkbox"
              checked={settings.autoPrintAfterSale}
              disabled={saving}
              onChange={(e) => void persist({ autoPrintAfterSale: e.target.checked })}
            />
            <span>{t(locale, "printerAutoPrint")}</span>
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={settings.silentPrint}
              disabled={saving}
              onChange={(e) => void persist({ silentPrint: e.target.checked })}
            />
            <span>{t(locale, "printerSilent")}</span>
          </label>

          <label style={selectLabel}>
            {t(locale, "printerDevice")}
            <select
              value={settings.printerName ?? ""}
              disabled={saving}
              onChange={(e) =>
                void persist({ printerName: e.target.value ? e.target.value : null })
              }
              style={selectInput}
            >
              <option value="">{t(locale, "printerDefault")}</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name}
                  {p.isDefault ? " ★" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            style={ghostBtn}
            disabled={saving || loading}
            onClick={() => void load(true)}
          >
            {t(locale, "printerRefresh")}
          </button>
        </div>
      )}

      {savedMsg ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "#15803d" }}>{savedMsg}</p>
      ) : null}
      {error ? (
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--tek-danger)" }}>{error}</p>
      ) : null}
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: "var(--tek-card)",
        border: "1px solid var(--tek-line)",
        borderRadius: 18,
        padding: 22,
        boxShadow: "var(--tek-shadow)",
      }}
    >
      <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 650 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "9px 0",
        borderBottom: "1px solid var(--tek-line)",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--tek-ash)" }}>{label}</span>
      <span style={{ textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

const checkRow: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  fontSize: 13,
  fontWeight: 650,
  cursor: "pointer",
  lineHeight: 1.4,
};

const selectLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 650,
  color: "var(--tek-ash)",
};

const selectInput: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  background: "var(--tek-bg)",
  color: "var(--tek-ink)",
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ink)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 13,
  cursor: "pointer",
  alignSelf: "flex-start",
};

const primaryBtn: CSSProperties = {
  border: "none",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
