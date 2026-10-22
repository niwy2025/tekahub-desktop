import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { AppLocale, Sale, SaleHistoryGroup, SaleHistoryQuery } from "@teka/shared";
import {
  SaleDetailSkeleton,
  SaleHistorySkeleton,
} from "../components/Skeleton";
import { useFocusTrap } from "../keyboard/useFocusTrap";
import { formatPrice } from "../hooks/useProducts";
import { friendlyNetworkError, t, type MessageKey } from "../i18n/messages";

function isCancelled(statut?: string | null): boolean {
  return (statut ?? "").toLowerCase().includes("annul");
}

function isValidated(statut?: string | null): boolean {
  const s = (statut ?? "").toLowerCase();
  return s.includes("valid") || s === "completed" || s === "paid";
}

function paymentLabel(locale: AppLocale, moyen?: string | null): string {
  switch ((moyen ?? "").toLowerCase()) {
    case "especes":
      return t(locale, "salePayEspeces");
    case "mobile_money":
      return t(locale, "salePayMobileMoney");
    case "carte_bancaire":
      return t(locale, "salePayCarte");
    case "virement":
      return t(locale, "salePayVirement");
    case "autre":
      return t(locale, "salePayAutre");
    default:
      return moyen?.trim() || "—";
  }
}

type RangePreset = "all" | "today" | "7d" | "30d";

type Props = {
  locale: AppLocale;
  currency?: string | null;
  companyName?: string | null;
  branchName?: string | null;
};

function toNum(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function queryForRange(range: RangePreset): SaleHistoryQuery {
  if (range === "all") return { limit: 100 };
  const to = new Date();
  const from = new Date();
  if (range === "today") {
    // same day
  } else if (range === "7d") {
    from.setDate(from.getDate() - 6);
  } else {
    from.setDate(from.getDate() - 29);
  }
  return {
    limit: 100,
    date_from: ymdLocal(from),
    date_to: ymdLocal(to),
  };
}

function formatTime(locale: AppLocale, value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(locale: AppLocale, value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(locale: AppLocale, statut?: string | null): string {
  const s = (statut ?? "").toLowerCase();
  if (s.includes("annul")) return t(locale, "historyStatusAnnulee");
  if (s.includes("brouillon") || s === "draft") return t(locale, "historyStatusBrouillon");
  if (s.includes("partiel") || s.includes("partial")) return t(locale, "historyStatusPartial");
  if (s.includes("valid") || s === "completed" || s === "paid") {
    return t(locale, "historyStatusValidee");
  }
  return statut?.trim() || "—";
}

function matchesQuery(sale: Sale, q: string): boolean {
  if (!q) return true;
  const hay = [sale.reference, sale.client_nom, sale.client_telephone, sale.id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function itemName(item: NonNullable<Sale["items"]>[number]): string {
  return item.produit_nom?.trim() || item.produit?.nom?.trim() || "—";
}

export function HistoryScreen({ locale, currency, companyName, branchName }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState<RangePreset>("today");
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SaleHistoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printMsg, setPrintMsg] = useState<string | null>(null);
  const [printOk, setPrintOk] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (typeof window.teka?.listSaleHistory !== "function") {
        setError(t(locale, "historyBridgeStale"));
        setGroups([]);
        return;
      }
      const res = await window.teka.listSaleHistory(queryForRange(range));
      setGroups(Array.isArray(res.groups) ? res.groups : []);
    } catch (err) {
      setGroups([]);
      setError(friendlyNetworkError(locale, err, "historyError"));
    } finally {
      setLoading(false);
    }
  }, [locale, range]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        ventes: g.ventes.filter((s) => matchesQuery(s, q)),
      }))
      .filter((g) => g.ventes.length > 0)
      .map((g) => ({
        ...g,
        total_count: g.ventes.length,
        total_amount: g.ventes.reduce((sum, s) => sum + toNum(s.montant_total), 0),
      }));
  }, [groups, query]);

  const flatIds = useMemo(
    () => filteredGroups.flatMap((g) => g.ventes.map((s) => s.id)),
    [filteredGroups],
  );

  const summary = useMemo(() => {
    const sales = filteredGroups.flatMap((g) => g.ventes);
    const active = sales.filter((s) => !isCancelled(s.statut));
    let revenue = 0;
    let paid = 0;
    let items = 0;
    let withClient = 0;
    let counter = 0;
    for (const sale of active) {
      revenue += toNum(sale.montant_total);
      paid += toNum(sale.montant_paye ?? sale.montant_total);
      const lineItems = sale.items;
      if (Array.isArray(lineItems) && lineItems.length > 0) {
        items += lineItems.reduce((sum, line) => sum + (toNum(line.quantite) || 0), 0);
      }
      if (sale.client_nom?.trim() || sale.client_telephone?.trim()) withClient += 1;
      else counter += 1;
    }
    const count = active.length;
    return {
      count,
      revenue: Math.round(revenue * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      avg: count > 0 ? Math.round((revenue / count) * 100) / 100 : 0,
      items,
      withClient,
      counter,
      days: filteredGroups.length,
    };
  }, [filteredGroups]);

  const rangeLabelKey = useMemo((): MessageKey => {
    switch (range) {
      case "today":
        return "historyRangeToday";
      case "7d":
        return "historyRange7d";
      case "30d":
        return "historyRange30d";
      default:
        return "historyRangeAll";
    }
  }, [range]);

  const openDetail = useCallback(
    async (saleId: string) => {
      setSelectedId(saleId);
      setDetail(null);
      setDetailError(null);
      setPrintMsg(null);
      setCancelConfirm(false);
      setCancelMsg(null);
      setDetailLoading(true);
      try {
        const sale = await window.teka.getSaleDetail(saleId);
        setDetail(sale);
      } catch (err) {
        setDetailError(friendlyNetworkError(locale, err, "historyError"));
      } finally {
        setDetailLoading(false);
      }
    },
    [locale],
  );

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setPrintMsg(null);
    setCancelConfirm(false);
    setCancelMsg(null);
    searchRef.current?.focus();
  }

  async function confirmCancelSale() {
    if (!detail || cancelBusy || !isValidated(detail.statut)) return;
    const lignes = (detail.items ?? [])
      .map((item) => ({
        produit_id: String(item.produit_id ?? ""),
        quantite: Math.max(1, Math.round(toNum(item.quantite) || 1)),
        prix_unitaire: toNum(item.prix_unitaire) || undefined,
      }))
      .filter((line) => Boolean(line.produit_id));

    if (lignes.length === 0) {
      setCancelMsg(t(locale, "historyCancelError"));
      return;
    }

    setCancelBusy(true);
    setCancelMsg(null);
    try {
      const updated = await window.teka.cancelSale({
        saleId: detail.id,
        lignes,
        moyen_paiement: detail.moyen_paiement ?? "especes",
        client_nom: detail.client_nom ?? null,
        client_telephone: detail.client_telephone ?? null,
      });
      setDetail({ ...detail, ...updated, statut: updated.statut ?? "annulee" });
      setCancelConfirm(false);
      setCancelMsg(t(locale, "historyCancelOk"));
      void load();
    } catch (err) {
      setCancelMsg(friendlyNetworkError(locale, err, "historyCancelError"));
    } finally {
      setCancelBusy(false);
    }
  }

  async function reprint() {
    if (!detail || printBusy) return;
    setPrintBusy(true);
    setPrintMsg(null);
    try {
      const lines = (detail.items ?? []).map((item) => {
        const qty = toNum(item.quantite) || 1;
        const unit = toNum(item.prix_unitaire);
        const total = toNum(item.total_ligne) || unit * qty;
        return { nom: itemName(item), qty, unit, total };
      });
      const result = await window.teka.printSaleReceipt({
        locale,
        currency: currency ?? detail.devise_principale ?? null,
        companyName: companyName ?? null,
        branchName: branchName ?? null,
        sale: detail,
        lines,
      });
      setPrintOk(Boolean(result.ok));
      setPrintMsg(
        result.ok
          ? t(locale, "historyDetailPrintOk")
          : result.error || t(locale, "historyDetailPrintFail"),
      );
    } catch (err) {
      setPrintOk(false);
      setPrintMsg(
        err instanceof Error ? err.message : t(locale, "historyDetailPrintFail"),
      );
    } finally {
      setPrintBusy(false);
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!flatIds.length) return;
    const idx = selectedId ? flatIds.indexOf(selectedId) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = flatIds[Math.min(flatIds.length - 1, Math.max(0, idx + 1))];
      setSelectedId(next);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = flatIds[Math.max(0, idx <= 0 ? 0 : idx - 1)];
      setSelectedId(next);
      return;
    }
    if (e.key === "Enter" && selectedId) {
      e.preventDefault();
      void openDetail(selectedId);
    }
  }

  const ranges: { id: RangePreset; key: MessageKey }[] = [
    { id: "today", key: "historyRangeToday" },
    { id: "7d", key: "historyRange7d" },
    { id: "30d", key: "historyRange30d" },
    { id: "all", key: "historyRangeAll" },
  ];

  return (
    <div style={{ padding: 28, display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, "historyTitle")}</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--tek-ash)" }}>
          {t(locale, "historyHint")}
        </p>
      </div>

      <div style={toolbar}>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "historySearchPlaceholder")}
          style={searchInput}
        />
        <div style={chips}>
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              style={range === r.id ? chipActive : chip}
            >
              {t(locale, r.key)}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13, flex: "1 1 200px" }}>
            {error}
          </p>
          <button type="button" onClick={() => void load()} style={retryBtn}>
            {t(locale, "historyRetry")}
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <section style={summarySection} aria-label={t(locale, "historySummaryPeriod")}>
          <div style={summaryGrid}>
            <SummaryCell
              label={t(locale, "historySummaryPeriod")}
              value={t(locale, rangeLabelKey)}
            />
            <SummaryCell
              label={t(locale, "historySummarySales")}
              value={String(summary.count)}
            />
            <SummaryCell
              label={t(locale, "historySummaryRevenue")}
              value={formatPrice(summary.revenue, locale, currency)}
              emphasize
            />
            <SummaryCell
              label={t(locale, "historySummaryAvg")}
              value={summary.count > 0 ? formatPrice(summary.avg, locale, currency) : "—"}
            />
            <SummaryCell
              label={t(locale, "historySummaryPaid")}
              value={formatPrice(summary.paid, locale, currency)}
            />
            <SummaryCell
              label={t(locale, "historySummaryItems")}
              value={summary.items > 0 ? String(summary.items) : "—"}
            />
            <SummaryCell
              label={t(locale, "historySummaryClients")}
              value={`${summary.withClient}`}
            />
            <SummaryCell
              label={t(locale, "historySummaryCounter")}
              value={`${summary.counter}`}
            />
          </div>
          {query.trim() ? (
            <p style={summaryNote}>{t(locale, "historySummaryFiltered")}</p>
          ) : null}
        </section>
      ) : null}

      {loading ? (
        <SaleHistorySkeleton groups={2} rowsPerGroup={4} />
      ) : filteredGroups.length === 0 ? (
        <p style={{ margin: 0, color: "var(--tek-ash)" }}>
          {t(locale, query.trim() ? "historyEmptyFilter" : "historyEmpty")}
        </p>
      ) : (
        <div
          role="listbox"
          tabIndex={0}
          onKeyDown={onListKeyDown}
          style={{ display: "grid", gap: 18, outline: "none" }}
        >
          {filteredGroups.map((group) => (
            <section key={group.date}>
              <header style={groupHeader}>
                <strong>{group.label}</strong>
                <span style={{ color: "var(--tek-ash)", fontSize: 13 }}>
                  {group.total_count} {t(locale, "historyGroupSales")} ·{" "}
                  {formatPrice(group.total_amount, locale, currency)}
                </span>
              </header>
              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={{ ...th, textAlign: "left" }}>{t(locale, "historyColRef")}</th>
                      <th style={{ ...th, textAlign: "left", width: 72 }}>
                        {t(locale, "historyColTime")}
                      </th>
                      <th style={{ ...th, textAlign: "left" }}>{t(locale, "historyColClient")}</th>
                      <th style={{ ...th, textAlign: "right", width: 110 }}>
                        {t(locale, "historyColAmount")}
                      </th>
                      <th style={{ ...th, textAlign: "right", width: 96 }}>
                        {t(locale, "historyColStatus")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.ventes.map((sale) => {
                      const active = sale.id === selectedId;
                      return (
                        <tr
                          key={sale.id}
                          role="option"
                          aria-selected={active}
                          onClick={() => void openDetail(sale.id)}
                          style={{
                            ...row,
                            background: active ? "rgba(244, 198, 15, 0.22)" : undefined,
                          }}
                        >
                          <td style={{ ...td, fontWeight: 650 }}>
                            {sale.reference || sale.id.slice(0, 8)}
                          </td>
                          <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                            {formatTime(locale, sale.date_vente)}
                          </td>
                          <td style={td}>
                            {sale.client_nom?.trim() ||
                              sale.client_telephone?.trim() ||
                              t(locale, "historyCounterSale")}
                          </td>
                          <td
                            style={{
                              ...td,
                              textAlign: "right",
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatPrice(sale.montant_total, locale, currency)}
                          </td>
                          <td style={{ ...td, textAlign: "right", fontSize: 12 }}>
                            {statusLabel(locale, sale.statut)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {selectedId ? (
        <SaleDetailModal
          locale={locale}
          currency={currency}
          loading={detailLoading}
          error={detailError}
          sale={detail}
          printBusy={printBusy}
          printMsg={printMsg}
          printOk={printOk}
          cancelBusy={cancelBusy}
          cancelConfirm={cancelConfirm}
          cancelMsg={cancelMsg}
          onClose={closeDetail}
          onPrint={() => void reprint()}
          onAskCancel={() => {
            setCancelConfirm(true);
            setCancelMsg(null);
          }}
          onAbortCancel={() => setCancelConfirm(false)}
          onConfirmCancel={() => void confirmCancelSale()}
        />
      ) : null}
    </div>
  );
}

function SaleDetailModal({
  locale,
  currency,
  loading,
  error,
  sale,
  printBusy,
  printMsg,
  printOk,
  cancelBusy,
  cancelConfirm,
  cancelMsg,
  onClose,
  onPrint,
  onAskCancel,
  onAbortCancel,
  onConfirmCancel,
}: {
  locale: AppLocale;
  currency?: string | null;
  loading: boolean;
  error: string | null;
  sale: Sale | null;
  printBusy: boolean;
  printMsg: string | null;
  printOk: boolean;
  cancelBusy: boolean;
  cancelConfirm: boolean;
  cancelMsg: string | null;
  onClose: () => void;
  onPrint: () => void;
  onAskCancel: () => void;
  onAbortCancel: () => void;
  onConfirmCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (cancelConfirm && !cancelBusy) {
          onAbortCancel();
          return;
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, cancelConfirm, cancelBusy, onAbortCancel]);

  const cur = currency ?? sale?.devise_principale ?? null;
  const canCancel = Boolean(sale && isValidated(sale.statut) && !isCancelled(sale.statut));

  return (
    <div role="presentation" style={backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        tabIndex={-1}
        style={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={dialogHeader}>
          <div>
            <p style={eyebrow}>{t(locale, "historyTitle")}</p>
            <h2 id="history-detail-title" style={{ margin: "4px 0 0", fontSize: 22 }}>
              {t(locale, "historyDetailTitle")}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={ghostBtn} disabled={cancelBusy}>
            Esc
          </button>
        </header>

        {loading ? (
          <SaleDetailSkeleton />
        ) : error ? (
          <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13 }}>{error}</p>
        ) : sale ? (
          <>
            <div style={metaGrid}>
              <Meta label={t(locale, "historyColRef")} value={sale.reference || sale.id} />
              <Meta
                label={t(locale, "historyColTime")}
                value={formatDateTime(locale, sale.date_vente)}
              />
              <Meta
                label={t(locale, "historyColClient")}
                value={
                  [sale.client_nom, sale.client_telephone].filter(Boolean).join(" · ") ||
                  t(locale, "historyCounterSale")
                }
              />
              <Meta label={t(locale, "historyColStatus")} value={statusLabel(locale, sale.statut)} />
              <Meta
                label={t(locale, "historyColPayment")}
                value={paymentLabel(locale, sale.moyen_paiement)}
              />
            </div>

            <h3 style={{ margin: "18px 0 10px", fontSize: 14 }}>
              {t(locale, "historyDetailLines")}
            </h3>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "left" }}>{t(locale, "saleColProduct")}</th>
                    <th style={{ ...th, textAlign: "right", width: 56 }}>
                      {t(locale, "saleColQty")}
                    </th>
                    <th style={{ ...th, textAlign: "right", width: 88 }}>
                      {t(locale, "saleColUnit")}
                    </th>
                    <th style={{ ...th, textAlign: "right", width: 96 }}>
                      {t(locale, "saleColLine")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(sale.items ?? []).map((item, i) => {
                    const qty = toNum(item.quantite);
                    const unit = toNum(item.prix_unitaire);
                    const total = toNum(item.total_ligne) || unit * qty;
                    return (
                      <tr key={item.id ?? `${item.produit_id}-${i}`}>
                        <td style={{ ...td, textAlign: "left" }}>{itemName(item)}</td>
                        <td style={{ ...td, textAlign: "right" }}>{qty || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {formatPrice(unit, locale, cur)}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                          {formatPrice(total, locale, cur)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={totalRow}>
              <span>{t(locale, "posCartTotal")}</span>
              <strong style={{ fontSize: 20 }}>
                {formatPrice(sale.montant_total, locale, cur)}
              </strong>
            </div>

            {printMsg ? (
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: 13,
                  color: printOk ? "#15803d" : "var(--tek-danger)",
                }}
              >
                {printMsg}
              </p>
            ) : null}

            {cancelMsg ? (
              <p
                style={{
                  margin: "12px 0 0",
                  fontSize: 13,
                  color: cancelMsg === t(locale, "historyCancelOk") ? "#15803d" : "var(--tek-danger)",
                }}
              >
                {cancelMsg}
              </p>
            ) : null}

            {cancelConfirm ? (
              <div style={cancelConfirmBox}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                  {t(locale, "historyCancelConfirm")}
                </p>
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={onConfirmCancel}
                    style={{ ...dangerBtn, opacity: cancelBusy ? 0.7 : 1 }}
                  >
                    {cancelBusy ? t(locale, "historyCancelling") : t(locale, "historyCancelYes")}
                  </button>
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={onAbortCancel}
                    style={cancelBtn}
                  >
                    {t(locale, "historyCancelNo")}
                  </button>
                </div>
              </div>
            ) : (
              <div style={actions}>
                <button
                  type="button"
                  disabled={printBusy || cancelBusy || isCancelled(sale.statut)}
                  onClick={onPrint}
                  style={{
                    ...primaryBtn,
                    opacity: printBusy || isCancelled(sale.statut) ? 0.7 : 1,
                  }}
                >
                  {printBusy ? t(locale, "historyDetailPrinting") : t(locale, "historyDetailPrint")}
                </button>
                {canCancel ? (
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={onAskCancel}
                    style={dangerGhostBtn}
                  >
                    {t(locale, "historyCancel")}
                  </button>
                ) : null}
                <button type="button" onClick={onClose} style={cancelBtn} disabled={cancelBusy}>
                  {t(locale, "historyDetailClose")}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaCell}>
      <span style={{ color: "var(--tek-ash)", fontSize: 11 }}>{label}</span>
      <strong style={{ fontSize: 13, wordBreak: "break-word" }}>{value}</strong>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div style={summaryCell}>
      <span style={summaryLabel}>{label}</span>
      <strong
        style={{
          fontSize: emphasize ? 18 : 15,
          fontWeight: emphasize ? 800 : 700,
          fontVariantNumeric: "tabular-nums",
          wordBreak: "break-word",
          lineHeight: 1.25,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

const toolbar: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
};

const summarySection: CSSProperties = {
  display: "grid",
  gap: 8,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};

const summaryCell: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
  minHeight: 64,
};

const summaryLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--tek-ash)",
};

const summaryNote: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: "var(--tek-ash)",
};

const searchInput: CSSProperties = {
  flex: "1 1 240px",
  maxWidth: 420,
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "12px 14px",
  background: "var(--tek-card)",
  color: "var(--tek-ink)",
};

const chips: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const chip: CSSProperties = {
  border: "1px solid var(--tek-line)",
  background: "transparent",
  color: "var(--tek-ink)",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 650,
  fontSize: 12,
  cursor: "pointer",
};

const chipActive: CSSProperties = {
  ...chip,
  border: "1px solid transparent",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
};

const retryBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "8px 14px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 650,
  fontSize: 13,
  cursor: "pointer",
};

const groupHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 8,
  fontSize: 15,
};

const tableWrap: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 14,
  overflow: "auto",
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
};

const td: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid var(--tek-line)",
  verticalAlign: "middle",
};

const row: CSSProperties = {
  cursor: "pointer",
};

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
  width: "min(640px, 100%)",
  maxHeight: "min(90vh, 760px)",
  overflow: "auto",
  background: "var(--tek-card)",
  borderRadius: 20,
  border: "1px solid var(--tek-line)",
  boxShadow: "var(--tek-shadow)",
  padding: 24,
};

const dialogHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 16,
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

const metaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};

const metaCell: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-bg)",
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

const actions: CSSProperties = {
  marginTop: 18,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const cancelConfirmBox: CSSProperties = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  border: "1px solid rgba(192, 38, 38, 0.35)",
  background: "rgba(192, 38, 38, 0.08)",
};

const dangerBtn: CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "12px 16px",
  background: "#b91c1c",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const dangerGhostBtn: CSSProperties = {
  border: "1px solid rgba(185, 28, 28, 0.45)",
  borderRadius: 14,
  padding: "12px 16px",
  background: "transparent",
  color: "#b91c1c",
  fontWeight: 650,
  fontSize: 14,
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "14px 16px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const cancelBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 14,
  padding: "14px 16px",
  background: "transparent",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 14,
  cursor: "pointer",
};
