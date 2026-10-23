import type { CSSProperties } from "react";
import type { AppLocale, ShellUpdateState } from "@teka/shared";
import { t } from "../i18n/messages";

type Props = {
  locale: AppLocale;
  shell: ShellUpdateState;
  onInstall: () => void;
  onOpenSettings?: () => void;
};

export function UpdateBanner({ locale, shell, onInstall, onOpenSettings }: Props) {
  const show =
    shell.status === "downloading" ||
    shell.status === "ready" ||
    shell.status === "available" ||
    shell.status === "error";

  if (!show) return null;

  const isReady = shell.status === "ready";
  const isErr = shell.status === "error";
  const versionLabel = shell.availableVersion
    ? ` v${shell.availableVersion}`
    : "";

  return (
    <div
      role="status"
      style={{
        ...banner,
        background: isErr
          ? "rgba(192, 38, 38, 0.1)"
          : isReady
            ? "rgba(244, 198, 15, 0.28)"
            : "rgba(244, 198, 15, 0.14)",
        borderBottom: "1px solid var(--tek-line)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 13 }}>
          {isReady
            ? t(locale, "updateReadyTitle")
            : isErr
              ? t(locale, "updateErrorTitle")
              : t(locale, "updateDownloadingTitle")}
          {versionLabel}
        </strong>
        <div style={{ fontSize: 12, color: "var(--tek-ash)", marginTop: 2 }}>
          {shell.message}
          {typeof shell.progress === "number" && shell.status === "downloading"
            ? ` (${shell.progress}%)`
            : null}
          {isErr && shell.error ? ` — ${shell.error}` : null}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {isReady ? (
          <button type="button" onClick={onInstall} style={primaryBtn}>
            {t(locale, "restartToApply")}
          </button>
        ) : null}
        {onOpenSettings ? (
          <button type="button" onClick={onOpenSettings} style={ghostBtn}>
            {t(locale, "navSettings")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const banner: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 16px",
  width: "100%",
};

const primaryBtn: CSSProperties = {
  border: "none",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
  color: "var(--tek-ink)",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 12,
  cursor: "pointer",
};
