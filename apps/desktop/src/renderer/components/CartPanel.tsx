import {
  forwardRef,
  useEffect,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
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
  selectedLineId: string | null;
  cartFocused: boolean;
  listRef?: RefObject<HTMLUListElement | null>;
  onSelectLine: (productId: string) => void;
  onEditLine: (productId: string) => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onValidate: () => void;
  onCartKeyDown: (e: KeyboardEvent<HTMLUListElement>) => void;
  onCartFocus: () => void;
  onCartBlur: () => void;
};

/**
 * Tab order scanner POS : Valider (2) → Vider (3).
 * Focus panier (F4) : flèches lignes, Entrée → modal quantité.
 */
export const CartPanel = forwardRef<HTMLButtonElement, Props>(function CartPanel(
  {
    locale,
    currency,
    cart,
    selectedLineId,
    cartFocused,
    listRef,
    onSelectLine,
    onEditLine,
    onIncrement,
    onDecrement,
    onRemove,
    onClear,
    onValidate,
    onCartKeyDown,
    onCartFocus,
    onCartBlur,
  },
  validateRef,
) {
  const total = cart.reduce((sum, line) => sum + unitPrice(line.product) * line.qty, 0);
  const itemsCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const canValidate = cart.length > 0;

  useEffect(() => {
    if (!cartFocused || !selectedLineId || !listRef?.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-cart-line="${CSS.escape(selectedLineId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [cartFocused, selectedLineId, listRef, cart]);

  return (
    <aside
      style={{
        ...panel,
        outline: cartFocused ? "2px solid var(--tek-yellow)" : "none",
        outlineOffset: 2,
      }}
      aria-label={t(locale, "posCart")}
    >
      <div style={header}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t(locale, "posCart")}</h2>
          {cart.length > 0 ? (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tek-ash)" }}>
              {itemsCount} {t(locale, "posCartItems")} · F4
            </p>
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--tek-ash)" }}>
              {t(locale, "posCartFocusHint")}
            </p>
          )}
        </div>
      </div>

      {cart.length === 0 ? (
        <div style={emptyBox}>
          <p style={{ margin: 0, color: "var(--tek-ash)", fontSize: 14 }}>
            {t(locale, "posCartEmpty")}
          </p>
        </div>
      ) : (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={t(locale, "posCart")}
          aria-activedescendant={
            selectedLineId ? `pos-cart-line-${selectedLineId}` : undefined
          }
          onKeyDown={onCartKeyDown}
          onFocus={onCartFocus}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              onCartBlur();
            }
          }}
          style={list}
        >
          {cart.map((line) => {
            const unit = unitPrice(line.product);
            const lineTotal = unit * line.qty;
            const selected = line.product.id === selectedLineId;
            return (
              <li
                key={line.product.id}
                id={`pos-cart-line-${line.product.id}`}
                data-cart-line={line.product.id}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onSelectLine(line.product.id);
                  onEditLine(line.product.id);
                }}
                style={{
                  ...lineCard,
                  borderColor: selected ? "var(--tek-black)" : "var(--tek-line)",
                  background: selected ? "rgba(244, 198, 15, 0.18)" : "var(--tek-bg)",
                  boxShadow:
                    selected && cartFocused ? "inset 0 0 0 2px var(--tek-black)" : undefined,
                  cursor: "pointer",
                }}
              >
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
                      tabIndex={-1}
                      aria-label={t(locale, "posCartDecrease")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDecrement(line.product.id);
                      }}
                      style={qtyBtn}
                    >
                      −
                    </button>
                    <span style={qtyValue} aria-live="polite">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={t(locale, "posCartIncrease")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIncrement(line.product.id);
                      }}
                      style={qtyBtn}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={t(locale, "posCartRemove")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(line.product.id);
                      }}
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
      )}

      <div style={footer}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: "var(--tek-ash)", fontWeight: 650 }}>
            {t(locale, "posCartTotal")}
          </span>
          <strong style={{ fontSize: 20 }}>
            {formatPrice(total, locale, currency)}
          </strong>
        </div>

        <div style={actions}>
          <button
            ref={validateRef}
            type="button"
            tabIndex={2}
            disabled={!canValidate}
            onClick={onValidate}
            style={{
              ...validateBtn,
              opacity: canValidate ? 1 : 0.5,
            }}
          >
            {t(locale, "posCartValidate")}
          </button>
          <button
            type="button"
            tabIndex={3}
            disabled={!canValidate}
            onClick={onClear}
            style={{
              ...clearBtn,
              opacity: canValidate ? 1 : 0.5,
            }}
          >
            {t(locale, "posCartClear")}
          </button>
        </div>
      </div>
    </aside>
  );
});

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
  outline: "none",
  borderRadius: 12,
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
  flexDirection: "column",
  gap: 12,
};

const actions: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 8,
};

const validateBtn: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "14px 16px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 800,
  fontSize: 16,
  boxShadow: "0 10px 28px rgba(244, 198, 15, 0.28)",
};

const clearBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "14px 16px",
  background: "transparent",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 14,
};
