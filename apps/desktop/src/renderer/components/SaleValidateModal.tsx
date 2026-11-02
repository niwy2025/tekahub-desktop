import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type {
  AppLocale,
  CreateSalePayload,
  EnterpriseExchangeRate,
  PaymentMethod,
  SalePaymentEncaissement,
} from "@teka/shared";
import { PAYMENT_METHODS } from "@teka/shared";
import {
  findClientByPhone,
  getClientsSnapshot,
  subscribeClients,
  upsertLocalClient,
} from "../catalog/clientCatalogStore";
import { applyLocalStockSale } from "../catalog/productCatalogStore";
import { formatPrice } from "../hooks/useProducts";
import { useFocusTrap } from "../keyboard/useFocusTrap";
import { friendlyNetworkError, t, type MessageKey } from "../i18n/messages";
import {
  formatExchangeRateHint,
  roundMoney,
  toMainAmount,
} from "../lib/currencyExchange";
import type { CartLine } from "./CartPanel";

type ClientStatus = "idle" | "checking" | "found" | "new" | "error";

type TenderLine = {
  key: string;
  devise: string;
  amount: string;
};

const PAYMENT_LABEL_KEY: Record<PaymentMethod, MessageKey> = {
  especes: "salePayEspeces",
  mobile_money: "salePayMobileMoney",
  carte_bancaire: "salePayCarte",
  virement: "salePayVirement",
  autre: "salePayAutre",
};

type Props = {
  locale: AppLocale;
  currency?: string | null;
  companyName?: string | null;
  branchName?: string | null;
  exchangeEnabled?: boolean;
  exchangeRates?: EnterpriseExchangeRate[];
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
  companyName,
  branchName,
  exchangeEnabled = false,
  exchangeRates = [],
  cart,
  onClose,
  onSuccess,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
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

  const mainCurrency = (currency ?? "CDF").trim().toUpperCase() || "CDF";
  const fxActive = Boolean(exchangeEnabled && exchangeRates.length > 0);
  const currencyOptions = fxActive
    ? [
        mainCurrency,
        ...exchangeRates
          .map((rate) => rate.devise.trim().toUpperCase())
          .filter((code) => code && code !== mainCurrency),
      ].filter((code, index, arr) => arr.indexOf(code) === index)
    : [mainCurrency];

  const [phoneLocal, setPhoneLocal] = useState("");
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [status, setStatus] = useState<ClientStatus>("idle");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("especes");
  const [paidInput, setPaidInput] = useState("");
  const [tenderLines, setTenderLines] = useState<TenderLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useFocusTrap(dialogRef, true);

  const total = cart.reduce((sum, line) => sum + unitPrice(line) * line.qty, 0);
  const itemsCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const fullPhone = toFullPhone(phoneLocal);
  const isCash = paymentMethod === "especes";

  const linePreviews = tenderLines.map((line) => {
    const amountValue = parseAmount(line.amount);
    const principal = toMainAmount(amountValue, line.devise, mainCurrency, exchangeRates);
    return { ...line, amountValue, principal };
  });
  const fxReceivedPrincipal = roundMoney(
    linePreviews.reduce((sum, line) => sum + line.principal, 0),
  );
  const fxAppliedPrincipal = Math.min(fxReceivedPrincipal, total);
  const fxRemaining = Math.max(0, roundMoney(total - fxAppliedPrincipal));
  const fxChange = Math.max(0, roundMoney(fxReceivedPrincipal - fxAppliedPrincipal));

  const useFxTender = fxActive && isCash;
  const paidAmount = useFxTender
    ? fxReceivedPrincipal
    : isCash
      ? parseAmount(paidInput)
      : total;
  const changeAmount = useFxTender
    ? fxChange
    : isCash
      ? Math.max(0, Math.round((paidAmount - total) * 100) / 100)
      : 0;
  const remainingAmount = useFxTender
    ? fxRemaining
    : isCash
      ? Math.max(0, Math.round((total - paidAmount) * 100) / 100)
      : 0;

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!paymentOpen) return;
    requestAnimationFrame(() => {
      if (paymentMethod === "especes") {
        paidRef.current?.focus();
        paidRef.current?.select();
      } else {
        payConfirmRef.current?.focus();
      }
    });
  }, [paymentOpen, paymentMethod]);

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
    setPaymentMethod("especes");
    setPaidInput(formatAmountInput(total));
    setTenderLines([
      {
        key: `line-${Date.now()}`,
        devise: mainCurrency,
        amount: total > 0 ? formatAmountInput(total) : "",
      },
    ]);
    setPaymentOpen(true);
  }

  function updateTenderLine(key: string, patch: Partial<TenderLine>) {
    setTenderLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
    setSubmitError(null);
  }

  function addTenderLine() {
    if (!fxActive || tenderLines.length >= 5) return;
    const next =
      currencyOptions.find((code) => !tenderLines.some((line) => line.devise === code)) ??
      mainCurrency;
    setTenderLines((prev) => [
      ...prev,
      { key: `line-${Date.now()}-${prev.length}`, devise: next, amount: "" },
    ]);
  }

  function removeTenderLine(key: string) {
    setTenderLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
    setSubmitError(null);
  }

  async function submitSale(e?: FormEvent) {
    e?.preventDefault();
    if (submitting || cart.length === 0) return;

    let encaissements: SalePaymentEncaissement[] | null = null;

    if (useFxTender) {
      encaissements = linePreviews
        .filter((line) => line.amountValue > 0)
        .map((line) => ({
          devise_paiement: line.devise,
          montant_recu_devise: line.amountValue,
        }));
      if (!encaissements.length) {
        setSubmitError(t(locale, "saleFxAmountRequired"));
        paidRef.current?.focus();
        return;
      }
      if (fxRemaining > 0.005) {
        setSubmitError(t(locale, "salePaidTooLow"));
        paidRef.current?.focus();
        return;
      }
    } else if (isCash && paidAmount + 0.0001 < total) {
      setSubmitError(t(locale, "salePaidTooLow"));
      paidRef.current?.focus();
      return;
    }

    const telephone = fullPhone;
    const nom = name.trim();

    setSubmitting(true);
    setSubmitError(null);

    // L’API refuse montant_paye_initial > total.
    // Espèces : monnaie locale caissier. Autres moyens : payé = total.
    // Multi-devises : encaissements[] résolus côté serveur.
    const payload: CreateSalePayload = {
      moyen_paiement: paymentMethod,
      statut: "validee",
      lignes: cart.map((line) => ({
        produit_id: line.product.id,
        quantite: line.qty,
        prix_unitaire: unitPrice(line) || undefined,
      })),
    };

    if (encaissements) {
      payload.encaissements = encaissements;
    } else {
      payload.montant_paye_initial = Math.min(isCash ? paidAmount : total, total);
    }

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

      if (sale.offline_queued) {
        applyLocalStockSale(payload.lignes);
      }

      // Fermer tout de suite : l’impression ne doit pas retarder la caisse.
      onSuccess();

      const receiptLines = cart.map((line) => {
        const unit = unitPrice(line);
        return {
          nom: line.product.nom,
          qty: line.qty,
          unit,
          total: unit * line.qty,
        };
      });
      const cashReceived = isCash ? paidAmount : null;
      const changeDue = isCash ? changeAmount : null;

      void (async () => {
        try {
          const printer = await window.teka.getPrinterSettings();
          if (!printer.autoPrintAfterSale) return;
          await window.teka.printSaleReceipt({
            locale,
            currency: currency ?? sale.devise_principale ?? null,
            companyName: companyName ?? null,
            branchName: branchName ?? null,
            sale,
            lines: receiptLines,
            cashReceived,
            changeDue,
          });
        } catch {
          // Imprimante indisponible / timeout — vente déjà enregistrée.
        }
      })();
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
            <p style={eyebrow}>
              {paymentOpen
                ? t(locale, "salePaymentMethod")
                : t(locale, "saleValidateEyebrow")}
            </p>
            <h2 id="sale-validate-title" style={{ margin: "4px 0 0", fontSize: 26 }}>
              {paymentOpen ? t(locale, "salePaidTitle") : t(locale, "saleValidateTitle")}
            </h2>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (paymentOpen) {
                setPaymentOpen(false);
                return;
              }
              onClose();
            }}
            style={ghostBtn}
          >
            Esc
          </button>
        </header>

        {paymentOpen ? (
          <section style={{ ...panel, minHeight: 0 }}>
            <div style={payMethodRow} role="group" aria-label={t(locale, "salePaymentMethod")}>
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setPaymentMethod(method);
                    setSubmitError(null);
                    if (method === "especes") {
                      setPaidInput(formatAmountInput(total));
                      if (fxActive) {
                        setTenderLines([
                          {
                            key: `line-${Date.now()}`,
                            devise: mainCurrency,
                            amount: total > 0 ? formatAmountInput(total) : "",
                          },
                        ]);
                      }
                    }
                  }}
                  style={paymentMethod === method ? payChipActive : payChip}
                >
                  {t(locale, PAYMENT_LABEL_KEY[method])}
                </button>
              ))}
            </div>

            <div style={payTotalBox}>
              <span style={{ color: "var(--tek-ash)", fontSize: 13 }}>
                {t(locale, "posCartTotal")}
              </span>
              <strong style={{ fontSize: 22 }}>
                {formatPrice(total, locale, mainCurrency)}
              </strong>
            </div>

            {isCash ? (
              <>
                {useFxTender ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    {linePreviews.map((line, index) => {
                      const rate = exchangeRates.find(
                        (item) => item.devise.trim().toUpperCase() === line.devise,
                      );
                      const foreign = line.devise !== mainCurrency;
                      return (
                        <div key={line.key} style={tenderLines.length > 1 ? fxLineBox : undefined}>
                          {tenderLines.length > 1 ? (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                alignItems: "center",
                                marginBottom: 6,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 650,
                                  color: "var(--tek-ash)",
                                }}
                              >
                                {t(locale, "saleFxCurrency")} {index + 1}
                              </span>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => removeTenderLine(line.key)}
                                style={{ ...linkBtn, marginTop: 0 }}
                              >
                                {t(locale, "saleFxRemoveLine")}
                              </button>
                            </div>
                          ) : null}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                currencyOptions.length > 1 ? "100px 1fr" : "1fr",
                              gap: 8,
                              alignItems: "end",
                            }}
                          >
                            {currencyOptions.length > 1 ? (
                              <label style={{ ...payLabel, marginTop: 0 }}>
                                {t(locale, "saleFxCurrency")}
                                <select
                                  value={line.devise}
                                  disabled={submitting}
                                  onChange={(e) =>
                                    updateTenderLine(line.key, {
                                      devise: e.target.value.toUpperCase(),
                                    })
                                  }
                                  style={paySelect}
                                >
                                  {currencyOptions.map((code) => (
                                    <option key={code} value={code}>
                                      {code}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : null}
                            <label style={{ ...payLabel, marginTop: 0 }}>
                              {t(locale, "salePaidLabel")}
                              <input
                                ref={index === 0 ? paidRef : undefined}
                                type="text"
                                inputMode="decimal"
                                value={line.amount}
                                disabled={submitting}
                                onChange={(e) =>
                                  updateTenderLine(line.key, { amount: e.target.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void submitSale();
                                  }
                                }}
                                style={payInput}
                              />
                            </label>
                          </div>
                          {foreign && rate && line.amountValue > 0 ? (
                            <p style={{ ...payHint, marginTop: 6 }}>
                              {formatExchangeRateHint(
                                mainCurrency,
                                line.devise,
                                Number(rate.taux),
                              )}
                              {" · "}
                              {t(locale, "saleFxConverted")}:{" "}
                              {formatPrice(line.principal, locale, mainCurrency)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
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
                )}

                {useFxTender && tenderLines.length < 5 ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={addTenderLine}
                    style={{ ...linkBtn, marginTop: 10 }}
                  >
                    {t(locale, "saleFxAddCurrency")}
                  </button>
                ) : null}

                {useFxTender && tenderLines.length > 1 ? (
                  <div style={{ ...payTotalBox, marginTop: 12 }}>
                    <span style={{ color: "var(--tek-ash)", fontSize: 13 }}>
                      {t(locale, "saleFxReceivedTotal")}
                    </span>
                    <strong>
                      {formatPrice(fxReceivedPrincipal, locale, mainCurrency)}
                    </strong>
                  </div>
                ) : null}

                <div style={changeBox(changeAmount > 0, remainingAmount > 0.005)}>
                  {changeAmount > 0 ? (
                    <>
                      <span>{t(locale, "saleChangeLabel")}</span>
                      <strong>{formatPrice(changeAmount, locale, mainCurrency)}</strong>
                    </>
                  ) : remainingAmount > 0.005 ? (
                    <>
                      <span>{t(locale, "saleRemainingLabel")}</span>
                      <strong>
                        {formatPrice(remainingAmount, locale, mainCurrency)}
                      </strong>
                    </>
                  ) : (
                    <>
                      <span>{t(locale, "saleChangeLabel")}</span>
                      <strong>{formatPrice(0, locale, mainCurrency)}</strong>
                    </>
                  )}
                </div>
                {changeAmount > 0 && !useFxTender ? (
                  <p style={payHint}>{t(locale, "saleChangeHint")}</p>
                ) : null}
              </>
            ) : (
              <p style={{ ...payHint, marginTop: 14 }}>{t(locale, "salePayOtherHint")}</p>
            )}

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
                {submitting
                  ? t(locale, "saleSubmitting")
                  : t(locale, isCash ? "salePaidConfirm" : "salePaidConfirmOther")}
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
          </section>
        ) : (
        <>
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
              {t(locale, "salePaymentMethod")}
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
        </>
        )}
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
  background: "var(--tek-card)",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  position: "sticky",
  top: 0,
  zIndex: 1,
  boxShadow: "0 1px 0 var(--tek-line)",
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

const fxLineBox: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  background: "var(--tek-bg)",
  padding: 12,
  display: "grid",
  gap: 8,
};

const paySelect: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "14px 12px",
  fontSize: 15,
  fontWeight: 700,
  background: "var(--tek-bg)",
  color: "var(--tek-ink)",
};

const payMethodRow: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 14,
};

const payChip: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ink)",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 12,
  cursor: "pointer",
};

const payChipActive: CSSProperties = {
  ...payChip,
  border: "1px solid transparent",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
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

const payHint: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 12,
  lineHeight: 1.4,
  color: "var(--tek-ash)",
};
