import type { UpdateStatus } from "@teka/shared";

const labels: Record<UpdateStatus, string> = {
  idle: "En attente",
  checking: "Vérification…",
  "up-to-date": "À jour",
  available: "Mise à jour dispo",
  downloading: "Téléchargement…",
  ready: "Redémarrer pour appliquer",
  error: "Erreur",
};

const colors: Record<UpdateStatus, string> = {
  idle: "var(--muted)",
  checking: "var(--warn)",
  "up-to-date": "var(--accent)",
  available: "var(--warn)",
  downloading: "var(--warn)",
  ready: "var(--accent)",
  error: "var(--danger)",
};

export function StatusBadge({
  status,
  message,
  progress,
}: {
  status: UpdateStatus;
  message?: string;
  progress?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 8,
          background: "var(--accent-soft)",
          border: "1px solid var(--border)",
          color: colors[status],
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: colors[status],
          }}
        />
        {message ?? labels[status]}
        {typeof progress === "number" && status === "downloading"
          ? ` ${progress}%`
          : null}
      </span>
    </div>
  );
}
