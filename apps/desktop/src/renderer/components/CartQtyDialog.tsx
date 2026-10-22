import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { AppLocale } from "@teka/shared";
import { formatPrice } from "../hooks/useProducts";
import { t } from "../i18n/messages";
import type { CartLine } from "./CartPanel";

type Props = {
  locale: AppLocale;
  currency?: string | null;
  line: CartLine;
  onConfirm: (qty: number) => void;
  onRemove: () => void;
  onClose: () => void;
};

/**
 * Modal quantité panier — un seul listener window (capture) pour éviter
 * les multiplications (backdrop + dialog + bouton focus).
 */
export function CartQtyDialog({
  locale,
  currency,
  line,
  onConfirm,
  onRemove,
  onClose,
}: Props) {
  const [qty, setQty] = useState(line.qty);
  const qtyRef = useRef(qty);
  const dialogRef = useRef<HTMLDivElement>(null);
  const unit = Number(line.product.prix_vente_ttc ?? line.product.prix_vente ?? 0) || 0;

  qtyRef.current = qty;

  useEffect(() => {
    setQty(line.qty);
  }, [line.product.id, line.qty]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    // Ignore les key-repeat de la touche qui vient d’ouvrir le modal.
    const openedAt = Date.now();

    const onKeyDown = (e: KeyboardEvent) => {
      const isQtyKey =
        e.key === "ArrowUp" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "+" ||
        e.key === "-" ||
        e.key === "Add" ||
        e.key === "Subtract";

      // La touche qui ouvre le modal (ou son key-repeat) ne doit pas multiplier la qty.
      if (isQtyKey && Date.now() - openedAt < 180) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        onConfirm(qtyRef.current);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "+" || e.key === "Add") {
        e.preventDefault();
        e.stopPropagation();
        setQty((prev) => Math.max(1, prev + 1));
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "-" || e.key === "Subtract") {
        e.preventDefault();
        e.stopPropagation();
        setQty((prev) => Math.max(1, prev - 1));
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, onConfirm, onRemove]);

  function bump(delta: number) {
    setQty((prev) => Math.max(1, prev + delta));
  }

  return (
    <div role="presentation" style={backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-qty-title"
        ref={dialogRef}
        tabIndex={-1}
        style={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={eyebrow}>{t(locale, "posQtyEdit")}</p>
        <h2 id="pos-qty-title" style={{ margin: "4px 0 0", fontSize: 20, lineHeight: 1.3 }}>
          {line.product.nom}
        </h2>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--tek-ash)" }}>
          {formatPrice(unit, locale, currency)} × {qty} ={" "}
          <strong style={{ color: "var(--tek-ink)" }}>
            {formatPrice(unit * qty, locale, currency)}
          </strong>
        </p>

        <div style={qtyRow}>
          <button type="button" tabIndex={-1} style={qtyBtn} onClick={() => bump(-1)} aria-label="-">
            −
          </button>
          <span style={qtyValue} aria-live="polite">
            {qty}
          </span>
          <button type="button" tabIndex={-1} style={qtyBtn} onClick={() => bump(1)} aria-label="+">
            +
          </button>
        </div>

        <p style={hint}>{t(locale, "posQtyHint")}</p>

        <div style={actions}>
          <button type="button" tabIndex={-1} style={confirmBtn} onClick={() => onConfirm(qty)}>
            {t(locale, "posQtyConfirm")}
          </button>
          <button type="button" tabIndex={-1} style={removeBtn} onClick={onRemove}>
            {t(locale, "posCartRemove")}
          </button>
          <button type="button" tabIndex={-1} style={cancelBtn} onClick={onClose}>
            {t(locale, "posQtyCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 40,
  background: "rgba(12, 12, 12, 0.45)",
  display: "grid",
  placeItems: "center",
  padding: 24,
};

const dialog: CSSProperties = {
  width: "min(400px, 100%)",
  background: "var(--tek-card)",
  borderRadius: 18,
  border: "1px solid var(--tek-line)",
  boxShadow: "var(--tek-shadow)",
  padding: 24,
  outline: "none",
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--tek-ash)",
};

const qtyRow: CSSProperties = {
  marginTop: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
};

const qtyBtn: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-bg)",
  fontSize: 22,
  fontWeight: 700,
  cursor: "pointer",
};

const qtyValue: CSSProperties = {
  minWidth: 64,
  textAlign: "center",
  fontSize: 36,
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
};

const hint: CSSProperties = {
  margin: "16px 0 0",
  fontSize: 12,
  color: "var(--tek-ash)",
  textAlign: "center",
  lineHeight: 1.45,
};

const actions: CSSProperties = {
  marginTop: 20,
  display: "grid",
  gap: 8,
};

const confirmBtn: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "14px 16px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
};

const removeBtn: CSSProperties = {
  border: "1px solid rgba(192, 38, 38, 0.25)",
  borderRadius: 12,
  padding: "12px 16px",
  background: "rgba(192, 38, 38, 0.08)",
  color: "var(--tek-danger)",
  fontWeight: 650,
  fontSize: 14,
  cursor: "pointer",
};

const cancelBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "12px 16px",
  background: "transparent",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 14,
  cursor: "pointer",
};
