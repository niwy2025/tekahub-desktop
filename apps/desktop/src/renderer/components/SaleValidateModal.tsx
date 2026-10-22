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

function unitPrice(line: CartLine): number {
  return Number(line.product.prix_vente_ttc ?? line.product.prix_vente ?? 0) || 0;
}

/**
 * Grand modal validation vente :
 * - récap lignes + total
 * - téléphone autofocus → check client
 * - nom si nouveau / optionnel si passage caisse
 * - Entrée sur téléphone lance le check ; Valider crée la vente
 */
export function SaleValidateModal({
  locale,
  currency,
  cart,
  onClose,
  onSuccess,
}: Props) {
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const clientsState = useSyncExternalStore(
    subscribeClients,
    getClientsSnapshot,
    getClientsSnapshot,
  );

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [status, setStatus] = useState<ClientStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = cart.reduce((sum, line) => sum + unitPrice(line) * line.qty, 0);
  const itemsCount = cart.reduce((sum, line) => sum + line.qty, 0);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, submitting]);

  /** Recherche 100 % locale — pas d’appel API à chaque numéro. */
  function runClientCheck(rawPhone: string) {
    const telephone = rawPhone.trim();
    if (!telephone) {
      setClientId(null);
      setStatus("idle");
      setStatusMsg(null);
      return;
    }

    setSubmitError(null);
    setStatus("checking");
    setStatusMsg(t(locale, "saleClientChecking"));

    const match = findClientByPhone(telephone, clientsState.clients);
    if (match?.id) {
      setClientId(match.id);
      setName(match.nom?.trim() || "");
      if (match.telephone) setPhone(match.telephone);
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
      runClientCheck(phone);
    }
  }

  function onNameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmRef.current?.focus();
    }
  }

  function clearClient() {
    setPhone("");
    setName("");
    setClientId(null);
    setStatus("idle");
    setStatusMsg(null);
    phoneRef.current?.focus();
  }

  async function submitSale(e?: FormEvent) {
    e?.preventDefault();
    if (submitting || cart.length === 0) return;

    const telephone = phone.trim();
    const nom = name.trim();

    if (telephone && status === "new" && !nom) {
      setSubmitError(t(locale, "saleClientNameRequired"));
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload: CreateSalePayload = {
      moyen_paiement: "especes",
      statut: "validee",
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
        // Nouveau client créé côté API — entrée locale jusqu’au prochain refresh.
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-validate-title"
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
            tabIndex={-1}
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
            <ul style={linesList}>
              {cart.map((line) => {
                const unit = unitPrice(line);
                return (
                  <li key={line.product.id} style={lineRow}>
                    <div style={{ minWidth: 0 }}>
                      <div style={lineName}>{line.product.nom}</div>
                      <div style={{ fontSize: 12, color: "var(--tek-ash)", marginTop: 2 }}>
                        {formatPrice(unit, locale, currency)} × {line.qty}
                      </div>
                    </div>
                    <strong style={{ fontSize: 14, flexShrink: 0 }}>
                      {formatPrice(unit * line.qty, locale, currency)}
                    </strong>
                  </li>
                );
              })}
            </ul>
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
            <p style={{ margin: "4px 0 14px", fontSize: 13, color: "var(--tek-ash)" }}>
              {t(locale, "saleClientHint")}
            </p>

            <label style={label}>
              {t(locale, "saleClientPhone")}
              <input
                ref={phoneRef}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setClientId(null);
                  if (status === "found" || status === "new") setStatus("idle");
                }}
                onKeyDown={onPhoneKeyDown}
                onBlur={() => {
                  if (phone.trim()) runClientCheck(phone);
                }}
                placeholder={t(locale, "saleClientPhonePlaceholder")}
                disabled={submitting}
                style={input}
              />
            </label>

            <div style={statusBox(status)} aria-live="polite">
              {statusMsg ?? t(locale, "saleClientOptional")}
            </div>

            <label style={label}>
              {t(locale, "saleClientName")}
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
                style={input}
              />
            </label>

            {(phone || name || clientId) && (
              <button type="button" tabIndex={-1} onClick={clearClient} style={linkBtn}>
                {t(locale, "saleClientSkip")}
              </button>
            )}
          </section>
        </div>

        {submitError ? (
          <p style={{ margin: "14px 0 0", color: "var(--tek-danger)", fontSize: 13 }}>
            {submitError}
          </p>
        ) : null}

        <div style={actions}>
          <button
            ref={confirmRef}
            type="button"
            disabled={submitting || cart.length === 0}
            onClick={() => void submitSale()}
            style={{
              ...confirmBtn,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? t(locale, "saleSubmitting") : t(locale, "saleConfirm")}
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={submitting}
            onClick={onClose}
            style={cancelBtn}
          >
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
  zIndex: 45,
  background: "rgba(12, 12, 12, 0.5)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const dialog: CSSProperties = {
  width: "min(920px, 100%)",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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

const linesList: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  maxHeight: 280,
  overflow: "auto",
};

const lineRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
};

const lineName: CSSProperties = {
  fontWeight: 650,
  fontSize: 14,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

const label: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 650,
  color: "var(--tek-ash)",
  marginBottom: 12,
};

const input: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: 16,
  background: "var(--tek-card)",
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
          : { bg: "var(--tek-card)", color: "var(--tek-ash)" };

  return {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--tek-line)",
    background: tone.bg,
    color: tone.color,
    fontSize: 13,
    fontWeight: 650,
  };
}

const linkBtn: CSSProperties = {
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
