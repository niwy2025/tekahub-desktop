import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { AppLocale } from "@teka/shared";
import { buildShortcutDocumentation } from "../keyboard/docs";
import { t } from "../i18n/messages";

/**
 * Page documentation clavier (F2).
 * Contenu généré depuis keyboard/docs.ts + SHORTCUTS — évolutif sans retoucher l’UI.
 */
export function ShortcutsDocsScreen({
  locale,
  onClose,
}: {
  locale: AppLocale;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sections = useMemo(() => buildShortcutDocumentation(), []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "F2") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>{t(locale, "docsEyebrow")}</p>
          <h1 style={title}>{t(locale, "shortcutHelpTitle")}</h1>
          <p style={lead}>{t(locale, "docsLead")}</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} style={closeBtn}>
          {t(locale, "shortcutClose")}
        </button>
      </header>

      <div style={sectionsWrap}>
        {sections.map((section) => (
          <section key={section.id} style={sectionCard} aria-labelledby={`docs-${section.id}`}>
            <h2 id={`docs-${section.id}`} style={sectionTitle}>
              {t(locale, section.titleKey)}
            </h2>
            <p style={sectionIntro}>{t(locale, section.introKey)}</p>
            <ul style={list}>
              {section.entries.map((entry) => (
                <li key={entry.id} style={row}>
                  <div style={rowText}>
                    <strong style={rowTitle}>{t(locale, entry.titleKey)}</strong>
                    <p style={rowDetail}>{t(locale, entry.detailKey)}</p>
                  </div>
                  <div style={keysWrap}>
                    {entry.keys.map((key) => (
                      <span key={`${entry.id}-${key}`} className="tek-kbd" style={kbd}>
                        {key}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p style={footerNote}>{t(locale, "docsFooter")}</p>
    </div>
  );
}

const page: CSSProperties = {
  padding: "24px 28px 40px",
  maxWidth: 920,
  margin: "0 auto",
  display: "grid",
  gap: 22,
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--tek-ash)",
};

const title: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 30,
  lineHeight: 1.15,
};

const lead: CSSProperties = {
  margin: "10px 0 0",
  maxWidth: 560,
  fontSize: 15,
  lineHeight: 1.5,
  color: "var(--tek-ash)",
};

const closeBtn: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  flexShrink: 0,
};

const sectionsWrap: CSSProperties = {
  display: "grid",
  gap: 16,
};

const sectionCard: CSSProperties = {
  background: "var(--tek-card)",
  border: "1px solid var(--tek-line)",
  borderRadius: 18,
  padding: "18px 20px",
  boxShadow: "var(--tek-shadow)",
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const sectionIntro: CSSProperties = {
  margin: "6px 0 14px",
  fontSize: 13,
  lineHeight: 1.45,
  color: "var(--tek-ash)",
};

const list: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  padding: "12px 0",
  borderTop: "1px solid var(--tek-line)",
};

const rowText: CSSProperties = {
  minWidth: 0,
  flex: 1,
};

const rowTitle: CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 700,
};

const rowDetail: CSSProperties = {
  margin: "4px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
  color: "var(--tek-ash)",
};

const keysWrap: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  justifyContent: "flex-end",
  flexShrink: 0,
  maxWidth: "42%",
};

const kbd: CSSProperties = {
  fontSize: 12,
};

const footerNote: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--tek-ash)",
  lineHeight: 1.45,
};
