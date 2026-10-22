import type { AppLocale } from "@teka/shared";

export function LanguageSwitch({
  locale,
  onChange,
}: {
  locale: AppLocale;
  onChange: (locale: AppLocale) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--tek-line)",
        borderRadius: 999,
        overflow: "hidden",
        background: "var(--tek-card)",
      }}
    >
      {(["fr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          style={{
            border: "none",
            padding: "6px 12px",
            background: locale === code ? "var(--tek-yellow)" : "transparent",
            color: "var(--tek-ink)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.04em",
          }}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
