import { useEffect, useRef } from "react";
import type { AppLocale } from "@teka/shared";
import { SHORTCUTS } from "../keyboard/shortcuts";
import { t } from "../i18n/messages";

export function ShortcutHelp({
  locale,
  open,
  onClose,
}: {
  locale: AppLocale;
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "F2") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tek-shortcut-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(12, 12, 12, 0.45)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "var(--tek-card)",
          borderRadius: 18,
          border: "1px solid var(--tek-line)",
          boxShadow: "var(--tek-shadow)",
          padding: 22,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="tek-shortcut-title" style={{ margin: 0, fontSize: 22 }}>
          {t(locale, "shortcutHelpTitle")}
        </h2>
        <p style={{ margin: "8px 0 16px", color: "var(--tek-ash)", fontSize: 13 }}>
          {t(locale, "shortcutHelpHint")}
        </p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {SHORTCUTS.map((s) => (
            <li
              key={s.action}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "8px 0",
                borderBottom: "1px solid var(--tek-line)",
                fontSize: 13,
              }}
            >
              <span>{t(locale, s.descriptionKey)}</span>
              <span className="tek-kbd">{s.label}</span>
            </li>
          ))}
        </ul>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          style={{
            marginTop: 18,
            width: "100%",
            border: "none",
            borderRadius: 999,
            padding: "12px 16px",
            background: "var(--tek-yellow)",
            color: "var(--tek-black)",
            fontWeight: 700,
          }}
        >
          {t(locale, "shortcutClose")}
        </button>
      </div>
    </div>
  );
}
