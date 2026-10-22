import type { AppLocale } from "@teka/shared";
import { t, type MessageKey } from "../i18n/messages";

export function PlaceholderScreen({
  locale,
  titleKey,
}: {
  locale: AppLocale;
  titleKey: Extract<MessageKey, "customersTitle" | "historyTitle">;
}) {
  return (
    <div style={{ padding: 40, maxWidth: 560 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, titleKey)}</h1>
      <p style={{ margin: "12px 0 0", color: "var(--tek-ash)", fontSize: 15 }}>
        {t(locale, "modulePlaceholder")}
      </p>
    </div>
  );
}
