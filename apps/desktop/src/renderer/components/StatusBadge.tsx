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

export function StatusBadge({
  status,
  message,
  progress,
}: {
  status: UpdateStatus;
  message?: string;
  progress?: number;
}) {
  const isOk = status === "up-to-date";
  const isWarn = status === "downloading" || status === "checking" || status === "available";
  const isErr = status === "error";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid var(--tek-line)",
        background: isOk
          ? "rgba(244, 198, 15, 0.18)"
          : isErr
            ? "rgba(192, 38, 38, 0.1)"
            : "var(--tek-card)",
        color: isErr ? "var(--tek-danger)" : "var(--tek-ink)",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isErr
            ? "var(--tek-danger)"
            : isWarn
              ? "var(--tek-yellow)"
              : isOk
                ? "var(--tek-black)"
                : "var(--tek-ash)",
        }}
      />
      {message ?? labels[status]}
      {typeof progress === "number" && status === "downloading" ? ` ${progress}%` : null}
    </span>
  );
}
