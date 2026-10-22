import type { CSSProperties, ReactNode } from "react";
import type { AppLocale, AuthUser, PackUpdateState, ShellUpdateState } from "@teka/shared";
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
          <Row label={t(locale, "shellVersion")} value={shell.currentVersion} />
          <div style={{ marginTop: 14 }}>
            <StatusBadge
              status={shell.status}
              message={shell.message}
              progress={shell.progress}
            />
          </div>
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
      </section>
    </div>
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

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ink)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 13,
};

const primaryBtn: CSSProperties = {
  border: "none",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
};
