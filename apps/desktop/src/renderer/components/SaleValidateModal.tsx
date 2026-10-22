import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { AppLocale, CreateSalePayload } from "@teka/shared";
import {
  findClientByPhone,
  getClientsSnapshot,
  subscribeClients,
  upsertLocalClient,
} from "../catalog/clientCatalogStore";
import { formatPrice } from "../hooks/useProducts";
import { useFocusTrap } from "../keyboard/useFocusTrap";
import { friendlyNetworkError, t } from "../i18n/messages";
import type { CartLine } from "./CartPanel";

type ClientStatus = "idle" | "checking" | "found" | "new" | "error";

type Props = {
  locale: AppLocale;
  currency?: string | null;
  cart: CartLine[];
  onClose: () => void;
  onSuccess: () => void;
};

const COUNTRY_CODE = "243";

function unitPrice(line: CartLine): number {
  return Number(line.product.prix_vente_ttc ?? line.product.prix_vente ?? 0) || 0;
}

function parseAmount(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function formatAmountInput(value: number): string {
  if (!Number.isFinite(value)) return "0";
  // Entrée clavier simple (pas de séparateur milliers)
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Partie locale du numéro (sans indicatif 243 / 0). */
function toLocalPhone(raw: string): string {
  let digits = raw.replace(/\D+/g, "");
  if (digits.startsWith(COUNTRY_CODE)) digits = digits.slice(COUNTRY_CODE.length);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** Numéro complet stocké / envoyé à l’API. */
function toFullPhone(local: string): string {
  const digits = toLocalPhone(local);
  if (!digits) return "";
  return `${COUNTRY_CODE}${digits}`;
}

/**
 * Grand modal validation vente :
 * - tableau lignes + total
 * - client en tableau, téléphone avec label 243
 */
export function SaleValidateModal({
  locale,
  currency,
  cart,
  onClose,
  onSuccess,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const payDialogRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const paidRef = useRef<HTMLInputElement>(null);
  const payConfirmRef = useRef<HTMLButtonElement>(null);
  const clientsState = useSyncExternalStore(
    subscribeClients,
    getClientsSnapshot,
    getClientsSnapshot,
  );

  const [phoneLocal, setPhoneLocal] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [status, setStatus] = useState<ClientStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paidInput, setPaidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useFocusTrap(dialogRef, !paymentOpen);
  useFocusTrap(payDialogRef, paymentOpen);

  const total = cart.reduce((sum, line) => sum + unitPrice(line) * line.qty, 0);
  const itemsCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const fullPhone = toFullPhone(phoneLocal);
  const paidAmount = parseAmount(paidInput);
  const changeAmount = Math.max(0, Math.round((paidAmount - total) * 100) / 100);
  const remainingAmount = Math.max(0, Math.round((total - paidAmount) * 100) / 100);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!paymentOpen) return;
    requestAnimationFrame(() => {
      paidRef.current?.focus();
      paidRef.current?.select();
    });
  }, [paymentOpen]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape" || submitting) return;
      e.preventDefault();
      e.stopPropagation();
      if (paymentOpen) {
        setPaymentOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, submitting, paymentOpen]);

  function runClientCheck(localRaw: string) {
    const local = toLocalPhone(localRaw);
    if (!local) {
      setClientId(null);
      setStatus("idle");
      setStatusMsg(null);
      return;
    }

    const telephone = toFullPhone(local);
    setSubmitError(null);
    setStatus("checking");
    setStatusMsg(t(locale, "saleClientChecking"));

    const match = findClientByPhone(telephone, clientsState.clients);
    if (match?.id) {
      setClientId(match.id);
      setName(match.nom?.trim() || "");
      setPhoneLocal(toLocalPhone(match.telephone ?? local));
      setStatus("found");
      setStatusMsg(
        `${t(locale, "saleClientFound")}${match.nom ? ` — ${match.nom}` : ""}`,
      );
      requestAnimationFrame(() => confirmRef.current?.focus());
      return;
    }

    setClientId(null);
    setStatus("new");
    setStatusMsg(
      clientsState.clients.length === 0 && !clientsState.loading
        ? t(locale, "saleClientCacheEmpty")
        : t(locale, "saleClientNew"),
    );
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  function onPhoneKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      runClientCheck(phoneLocal);
    }
  }

  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmRef.current?.focus();
    }
  }

  function clearClient() {
    setPhoneLocal("");
    setName("");
    setClientId(null);
    setStatus("idle");
    setStatusMsg(null);
    phoneRef.current?.focus();
  }

  function openPaymentStep() {
    if (cart.length === 0) return;
    const telephone = fullPhone;
    const nom = name.trim();

    if (telephone && status === "new" && !nom) {
      setSubmitError(t(locale, "saleClientNameRequired"));
      nameRef.current?.focus();
      return;
    }

    setSubmitError(null);
    setPaidInput(formatAmountInput(total));
    setPaymentOpen(true);
  }

  async function submitSale(e?: FormEvent) {
    e?.preventDefault();
    if (submitting || cart.length === 0) return;

    if (paidAmount + 0.0001 < total) {
      setSubmitError(t(locale, "salePaidTooLow"));
      paidRef.current?.focus();
      return;
    }

    const telephone = fullPhone;
    const nom = name.trim();

    setSubmitting(true);
    setSubmitError(null);

    const payload: CreateSalePayload = {
      moyen_paiement: "especes",
      statut: "validee",
      montant_paye_initial: paidAmount,
      lignes: cart.map((line) => ({
        produit_id: line.product.id,
        quantite: line.qty,
        prix_unitaire: unitPrice(line) || undefined,
      })),
    };

    if (clientId || telephone || nom) {
      payload.client_id = clientId;
      payload.client_telephone = telephone || null;
      payload.client_nom = nom || null;
    }

    try {
      const sale = await window.teka.createSale(payload);
      if (clientId) {
        upsertLocalClient({
          id: clientId,
          nom: nom || sale.client_nom || null,
          telephone: telephone || sale.client_telephone || null,
        });
      } else if (telephone && nom) {
        upsertLocalClient({
          id: `local:${telephone}`,
          nom,
          telephone,
        });
      }
      onSuccess();
    } catch (err) {
      setSubmitError(friendlyNetworkError(locale, err, "saleSubmitError"));
      setSubmitting(false);
    }
  }

  return (
    <div role="presentation" style={backdrop} onClick={() => !submitting && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-validate-title"
        tabIndex={-1}
        style={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={header}>
          <div>
            <p style={eyebrow}>{t(locale, "saleValidateEyebrow")}</p>
            <h2 id="sale-validate-title" style={{ margin: "4px 0 0", fontSize: 26 }}>
              {t(locale, "saleValidateTitle")}
            </h2>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={ghostBtn}
          >
            Esc
          </button>
        </header>

        <div style={grid}>
          <section style={panel}>
            <h3 style={sectionTitle}>{t(locale, "saleValidateLines")}</h3>
            <p style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--tek-ash)" }}>
              {itemsCount} {t(locale, "posCartItems")}
            </p>

            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "left" }}>{t(locale, "saleColProduct")}</th>
                    <th style={{ ...th, textAlign: "right", width: 56 }}>{t(locale, "saleColQty")}</th>
                    <th style={{ ...th, textAlign: "right", width: 88 }}>{t(locale, "saleColUnit")}</th>
                    <th style={{ ...th, textAlign: "right", width: 96 }}>{t(locale, "saleColLine")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => {
                    const unit = unitPrice(line);
                    return (
                      <tr key={line.product.id}>
                        <td style={{ ...td, textAlign: "left" }}>
                          <div style={lineName}>{line.product.nom}</div>
                        </td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {line.qty}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {formatPrice(unit, locale, currency)}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: "right",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatPrice(unit * line.qty, locale, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={totalRow}>
              <span>{t(locale, "posCartTotal")}</span>
              <strong style={{ fontSize: 22 }}>
                {formatPrice(total, locale, currency)}
              </strong>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--tek-ash)" }}>
              {t(locale, "salePaymentCash")}
            </p>
          </section>

          <section style={panel}>
            <h3 style={sectionTitle}>{t(locale, "saleClientSection")}</h3>
            <p style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--tek-ash)" }}>
              {t(locale, "saleClientHint")}
            </p>

            <div style={tableWrap}>
              <table style={table}>
                <tbody>
                  <tr>
                    <th scope="row" style={rowLabel}>
                      {t(locale, "saleClientPhone")}
                    </th>
                    <td style={td}>
                      <div style={phoneField}>
                        <span style={phonePrefix} aria-hidden>
                          {t(locale, "saleClientPhonePrefix")}
                        </span>
                        <input
                          ref={phoneRef}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={phoneLocal}
                          onChange={(e) => {
                            setPhoneLocal(toLocalPhone(e.target.value));
                            setClientId(null);
                            if (status === "found" || status === "new") setStatus("idle");
                          }}
                          onKeyDown={onPhoneKeyDown}
                          onBlur={() => {
                            if (phoneLocal.trim()) runClientCheck(phoneLocal);
                          }}
                          placeholder={t(locale, "saleClientPhonePlaceholder")}
                          disabled={submitting}
                          style={phoneInput}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" style={rowLabel}>
                      {t(locale, "saleClientStatus")}
                    </th>
                    <td style={td}>
                      <div style={statusBox(status)} aria-live="polite">
                        {statusMsg ?? t(locale, "saleClientOptional")}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" style={rowLabel}>
                      {t(locale, "saleClientName")}
                    </th>
                    <td style={td}>
                      <input
                        ref={nameRef}
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (clientId) setClientId(null);
                        }}
                        onKeyDown={onNameKeyDown}
                        placeholder={t(locale, "saleClientNamePlaceholder")}
                        disabled={submitting}
                        style={inputBare}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {(phoneLocal || name || clientId) && (
              <button type="button" onClick={clearClient} style={linkBtn}>
                {t(locale, "saleClientSkip")}
              </button>
            )}
          </section>
        </div>

        {submitError && !paymentOpen ? (
          <p style={{ margin: "14px 0 0", color: "var(--tek-danger)", fontSize: 13 }}>
            {submitError}
          </p>
        ) : null}

        <div style={actions}>
          <button
            ref={confirmRef}
            type="button"
            disabled={submitting || cart.length === 0}
            onClick={openPaymentStep}
            style={{
              ...confirmBtn,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {t(locale, "saleConfirm")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={cancelBtn}
          >
            {t(locale, "posQtyCancel")}
          </button>
        </div>

        {paymentOpen ? (
          <div
            role="presentation"
            style={payBackdrop}
            onClick={() => !submitting && setPaymentOpen(false)}
          >
            <div
              ref={payDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sale-pay-title"
              tabIndex={-1}
              style={payDialog}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={eyebrow}>{t(locale, "salePaymentCash")}</p>
              <h3 id="sale-pay-title" style={{ margin: "4px 0 0", fontSize: 20 }}>
                {t(locale, "salePaidTitle")}
              </h3>

              <div style={payTotalBox}>
                <span style={{ color: "var(--tek-ash)", fontSize: 13 }}>
                  {t(locale, "posCartTotal")}
                </span>
                <strong style={{ fontSize: 22 }}>
                  {formatPrice(total, locale, currency)}
                </strong>
              </div>

              <label style={payLabel}>
                {t(locale, "salePaidLabel")}
                <input
                  ref={paidRef}
                  type="text"
                  inputMode="decimal"
                  value={paidInput}
                  disabled={submitting}
                  onChange={(e) => {
                    setPaidInput(e.target.value);
                    setSubmitError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitSale();
                    }
                  }}
                  style={payInput}
                />
              </label>

              <div style={changeBox(changeAmount > 0, remainingAmount > 0.005)}>
                {changeAmount > 0 ? (
                  <>
                    <span>{t(locale, "saleChangeLabel")}</span>
                    <strong>{formatPrice(changeAmount, locale, currency)}</strong>
                  </>
                ) : remainingAmount > 0.005 ? (
                  <>
                    <span>{t(locale, "saleRemainingLabel")}</span>
                    <strong>{formatPrice(remainingAmount, locale, currency)}</strong>
                  </>
                ) : (
                  <>
                    <span>{t(locale, "saleChangeLabel")}</span>
                    <strong>{formatPrice(0, locale, currency)}</strong>
                  </>
                )}
              </div>

              {submitError ? (
                <p style={{ margin: "12px 0 0", color: "var(--tek-danger)", fontSize: 13 }}>
                  {submitError}
                </p>
              ) : null}

              <div style={{ ...actions, marginTop: 16 }}>
                <button
                  ref={payConfirmRef}
                  type="button"
                  disabled={submitting}
                  onClick={() => void submitSale()}
                  style={{
                    ...confirmBtn,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? t(locale, "saleSubmitting") : t(locale, "salePaidConfirm")}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setPaymentOpen(false)}
                  style={cancelBtn}
                >
                  {t(locale, "posQtyCancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 45,
  background: "rgba(12, 12, 12, 0.5)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const dialog: CSSProperties = {
  position: "relative",
  width: "min(960px, 100%)",
  maxHeight: "min(90vh, 820px)",
  overflow: "auto",
  background: "var(--tek-card)",
  borderRadius: 20,
  border: "1px solid var(--tek-line)",
  boxShadow: "var(--tek-shadow)",
  padding: 24,
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 18,
};

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--tek-ash)",
};

const ghostBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "8px 12px",
  background: "transparent",
  color: "var(--tek-ash)",
  fontWeight: 650,
  cursor: "pointer",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 16,
};

const panel: CSSProperties = {
  background: "var(--tek-bg)",
  border: "1px solid var(--tek-line)",
  borderRadius: 16,
  padding: 16,
  minHeight: 280,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  fontSize: 15,
};

const tableWrap: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  overflow: "auto",
  maxHeight: 300,
  background: "var(--tek-card)",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--tek-line)",
  background: "rgba(0,0,0,0.03)",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  position: "sticky",
  top: 0,
};

const td: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid var(--tek-line)",
  verticalAlign: "middle",
};

const rowLabel: CSSProperties = {
  ...td,
  width: 108,
  textAlign: "left",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 12,
  background: "rgba(0,0,0,0.02)",
};

const lineName: CSSProperties = {
  fontWeight: 650,
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 220,
};

const totalRow: CSSProperties = {
  marginTop: 14,
  paddingTop: 14,
  borderTop: "1px solid var(--tek-line)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontWeight: 650,
};

const phoneField: CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  overflow: "hidden",
  background: "var(--tek-bg)",
};

const phonePrefix: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "0 12px",
  background: "rgba(244, 198, 15, 0.35)",
  color: "var(--tek-black)",
  fontWeight: 800,
  fontSize: 15,
  borderRight: "1px solid var(--tek-line)",
  fontVariantNumeric: "tabular-nums",
};

const phoneInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  padding: "11px 12px",
  fontSize: 16,
  background: "transparent",
  color: "var(--tek-ink)",
  fontVariantNumeric: "tabular-nums",
};

const inputBare: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 15,
  background: "var(--tek-bg)",
  color: "var(--tek-ink)",
};

function statusBox(status: ClientStatus): CSSProperties {
  const tone =
    status === "found"
      ? { bg: "rgba(22, 163, 74, 0.12)", color: "#15803d" }
      : status === "new"
        ? { bg: "rgba(244, 198, 15, 0.2)", color: "var(--tek-black)" }
        : status === "error"
          ? { bg: "rgba(192, 38, 38, 0.1)", color: "var(--tek-danger)" }
          : { bg: "transparent", color: "var(--tek-ash)" };

  return {
    padding: "8px 10px",
    borderRadius: 8,
    background: tone.bg,
    color: tone.color,
    fontSize: 13,
    fontWeight: 650,
  };
}

const linkBtn: CSSProperties = {
  marginTop: 12,
  border: "none",
  background: "transparent",
  color: "var(--tek-ash)",
  fontSize: 13,
  fontWeight: 650,
  padding: 0,
  cursor: "pointer",
  textDecoration: "underline",
};

const actions: CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
};

const confirmBtn: CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "16px 18px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
};

const cancelBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 14,
  padding: "16px 18px",
  background: "transparent",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 14,
  cursor: "pointer",
};

const payBackdrop: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  background: "rgba(12, 12, 12, 0.4)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  borderRadius: 20,
};

const payDialog: CSSProperties = {
  width: "min(380px, 100%)",
  background: "var(--tek-card)",
  borderRadius: 16,
  border: "1px solid var(--tek-line)",
  boxShadow: "var(--tek-shadow)",
  padding: 20,
};

const payTotalBox: CSSProperties = {
  marginTop: 14,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-bg)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const payLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  marginTop: 14,
  fontSize: 12,
  fontWeight: 650,
  color: "var(--tek-ash)",
};

const payInput: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 22,
  fontWeight: 800,
  fontVariantNumeric: "tabular-nums",
  background: "var(--tek-bg)",
  color: "var(--tek-ink)",
};

function changeBox(hasChange: boolean, hasRemaining: boolean): CSSProperties {
  const bg = hasChange
    ? "rgba(22, 163, 74, 0.12)"
    : hasRemaining
      ? "rgba(244, 198, 15, 0.22)"
      : "var(--tek-bg)";
  return {
    marginTop: 12,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid var(--tek-line)",
    background: bg,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
    fontWeight: 650,
  };
}
