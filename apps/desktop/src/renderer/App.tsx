import type { ReactNode } from "react";
import { StatusBadge } from "./components/StatusBadge";
import { useUpdates } from "./hooks/useUpdates";

export function App() {
  const { info, shell, packs, busy, checkNow, installShell, rollback } = useUpdates();

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        gap: 40,
      }}
    >
      <header>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Shell desktop
        </p>
        <h1
          style={{
            margin: "8px 0 0",
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          TekaHub
        </h1>
        <p style={{ margin: "12px 0 0", color: "var(--muted)", maxWidth: 480 }}>
          Runtime installé une fois. Contenu et packs versionnés dans le dossier
          utilisateur — mises à jour sans réinstaller.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        <Panel title="Application">
          <Row label="Version shell" value={info?.version ?? "…"} />
          <Row label="Plateforme" value={info?.platform ?? "…"} />
          <Row label="Données" value={info?.userDataPath ?? "…"} mono />
          <div style={{ marginTop: 16 }}>
            <StatusBadge
              status={shell.status}
              message={shell.message}
              progress={shell.progress}
            />
          </div>
          {shell.availableVersion ? (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Disponible : v{shell.availableVersion}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Btn onClick={() => void checkNow()} disabled={busy}>
              Vérifier les mises à jour
            </Btn>
            {shell.status === "ready" ? (
              <Btn primary onClick={() => void installShell()}>
                Redémarrer pour appliquer
              </Btn>
            ) : null}
          </div>
        </Panel>

        <Panel title="Packs dynamiques">
          {packs.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
              Aucun état pack pour l’instant. Configure{" "}
              <code>PACKS_UPDATE_URL</code> pour activer les téléchargements.
            </p>
          ) : (
            packs.map((p) => (
              <div key={p.packId} style={{ marginBottom: 16 }}>
                <Row label="Pack" value={p.packId} />
                <Row label="Version" value={p.currentVersion ?? "—"} />
                <div style={{ marginTop: 10 }}>
                  <StatusBadge
                    status={p.status}
                    message={p.message}
                    progress={p.progress}
                  />
                </div>
                {p.error ? (
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--danger)" }}>
                    {p.error}
                  </p>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <Btn onClick={() => void rollback(p.packId)} disabled={busy}>
                    Rollback
                  </Btn>
                </div>
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
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 24,
      }}
    >
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "8px 0",
        borderBottom: "1px solid var(--border)",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span
        style={{
          textAlign: "right",
          wordBreak: "break-all",
          fontFamily: mono ? "ui-monospace, monospace" : undefined,
          fontSize: mono ? 11 : 13,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: primary ? "none" : "1px solid var(--border)",
        background: primary ? "var(--accent)" : "transparent",
        color: primary ? "#04140f" : "var(--text)",
        padding: "8px 14px",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 13,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
