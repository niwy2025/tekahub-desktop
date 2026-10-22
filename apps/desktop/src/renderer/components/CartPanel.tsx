import type { CSSProperties } from "react";
import type { AppLocale, Product } from "@teka/shared";
import { formatPrice } from "../hooks/useProducts";
import { t } from "../i18n/messages";

export type CartLine = { product: Product; qty: number };

function unitPrice(product: Product): number {
  return Number(product.prix_vente_ttc ?? product.prix_vente ?? 0) || 0;
}

type Props = {
  locale: AppLocale;
  currency?: string | null;
  cart: CartLine[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
};

export function CartPanel({
  locale,
  currency,
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
}: Props) {
  const total = cart.reduce((sum, line) => sum + unitPrice(line.product) * line.qty, 0);
  const itemsCount = cart.reduce((sum, line) => sum + line.qty, 0);

  return (
    <aside style={panel} aria-label={t(locale, "posCart")}>
      <div style={header}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t(locale, "posCart")}</h2>
          {cart.length > 0 ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tek-ash)" }}>
              {itemsCount} {t(locale, "posCartItems")}
            </p>
          ) : null}
        </div>
        {cart.length > 0 ? (
          <button type="button" onClick={onClear} style={ghostBtn}>
            {t(locale, "posCartClear")}
          </button>
        ) : null}
      </div>

      {cart.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ margin: 0, color: "var(--tek-ash)", fontSize: 14 }}>
            {t(locale, "posCartEmpty")}
          </p>
        </div>
      ) : (
        <>
          <ul style={list}>
            {cart.map((line) => {
              const unit = unitPrice(line.product);
              const lineTotal = unit * line.qty;
              return (
                <li key={line.product.id} style={lineCard}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 650,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={line.product.nom}
                    >
                      {line.product.nom}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--tek-ash)", marginTop: 4 }}>
                      {formatPrice(unit, locale, currency)} × {line.qty}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <strong style={{ fontSize: 14 }}>
                      {formatPrice(lineTotal, locale, currency)}
                    </strong>
                    <div style={qtyRow}>
                      <button
                        type="button"
                        aria-label={t(locale, "posCartDecrease")}
                        title="-"
                        onClick={() => onDecrement(line.product.id)}
                        style={qtyBtn}
                      >
                        −
                      </button>
                      <span style={qtyValue} aria-live="polite">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={t(locale, "posCartIncrease")}
                        title="+"
                        onClick={() => onIncrement(line.product.id)}
                        style={qtyBtn}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={t(locale, "posCartRemove")}
                        title={t(locale, "posCartRemove")}
                        onClick={() => onRemove(line.product.id)}
                        style={removeBtn}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div style={footer}>
            <span style={{ color: "var(--tek-ash)", fontWeight: 650 }}>
              {t(locale, "posCartTotal")}
            </span>
            <strong style={{ fontSize: 20 }}>
              {formatPrice(total, locale, currency)}
            </strong>
          </div>
        </>
      )}
    </aside>
  );
}

const panel: CSSProperties = {
  background: "var(--tek-card)",
  border: "1px solid var(--tek-line)",
  borderRadius: 18,
  padding: 18,
  boxShadow: "var(--tek-shadow)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  maxHeight: "calc(100vh - 180px)",
};

const header: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const emptyBox: CSSProperties = {
  flex: 1,
  display: "grid",
  placeItems: "center",
  border: "1px dashed var(--tek-line)",
  borderRadius: 14,
  padding: 24,
  background: "var(--tek-bg)",
};

const list: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  overflow: "auto",
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const lineCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-bg)",
};

const qtyRow: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const qtyBtn: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
  color: "var(--tek-ink)",
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
};

const qtyValue: CSSProperties = {
  minWidth: 28,
  textAlign: "center",
  fontWeight: 700,
  fontSize: 14,
};

const removeBtn: CSSProperties = {
  width: 32,
  height: 32,
  marginLeft: 4,
  borderRadius: 10,
  border: "1px solid rgba(192, 38, 38, 0.25)",
  background: "rgba(192, 38, 38, 0.08)",
  color: "var(--tek-danger)",
  fontWeight: 700,
  fontSize: 18,
  lineHeight: 1,
  padding: 0,
};

const footer: CSSProperties = {
  marginTop: 14,
  paddingTop: 14,
  borderTop: "1px solid var(--tek-line)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ash)",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 12,
};
