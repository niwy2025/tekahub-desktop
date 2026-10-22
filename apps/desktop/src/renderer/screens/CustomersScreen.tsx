import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import type { AppLocale, Client, ClientStats } from "@teka/shared";
import {
  getClientsSnapshot,
  refreshClients,
  subscribeClients,
} from "../catalog/clientCatalogStore";
import { ClientListSkeleton, SaleDetailSkeleton } from "../components/Skeleton";
import { formatPrice } from "../hooks/useProducts";
import { useFocusTrap } from "../keyboard/useFocusTrap";
import { friendlyNetworkError, t } from "../i18n/messages";

type Props = {
  locale: AppLocale;
  currency?: string | null;
};

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function filterClients(clients: Client[], search: string): Client[] {
  const q = normalizeText(search);
  if (!q) return clients;
  return clients.filter((c) =>
    [c.nom, c.telephone, c.email, c.adresse]
      .filter(Boolean)
      .some((v) => normalizeText(String(v)).includes(q)),
  );
}

function formatWhen(locale: AppLocale, value?: string | null): string {
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

export function CustomersScreen({ locale, currency }: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const catalog = useSyncExternalStore(subscribeClients, getClientsSnapshot, getClientsSnapshot);

  const [selected, setSelected] = useState<Client | null>(null);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const clients = useMemo(
    () => filterClients(catalog.clients, query),
    [catalog.clients, query],
  );

  const loading = catalog.loading && catalog.clients.length === 0;

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const openDetail = useCallback(
    async (client: Client) => {
      setSelected(client);
      setStats(null);
      setDetailClient(client);
      setDetailError(null);
      setDetailLoading(true);
      try {
        if (typeof window.teka?.getClientStats !== "function") {
          setDetailError(t(locale, "customersBridgeStale"));
          return;
        }
        if (client.id.startsWith("local:")) {
          setDetailClient(client);
          setStats(null);
          return;
        }
        const res = await window.teka.getClientStats(client.id);
        setDetailClient(res.client ?? client);
        setStats(res.stats);
      } catch (err) {
        setDetailError(friendlyNetworkError(locale, err, "customersStatsError"));
      } finally {
        setDetailLoading(false);
      }
    },
    [locale],
  );

  function closeDetail() {
    setSelected(null);
    setStats(null);
    setDetailClient(null);
    setDetailError(null);
    searchRef.current?.focus();
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!clients.length) return;
    const idx = selected ? clients.findIndex((c) => c.id === selected.id) : -1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = clients[Math.min(clients.length - 1, Math.max(0, idx + 1))];
      setSelected(next);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = clients[Math.max(0, idx <= 0 ? 0 : idx - 1)];
      setSelected(next);
      return;
    }
    if (e.key === "Enter" && selected) {
      e.preventDefault();
      void openDetail(selected);
    }
  }

  return (
    <div style={{ padding: 28, display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, "customersTitle")}</h1>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--tek-ash)" }}>
          {t(locale, "customersHint")}
        </p>
      </div>

      <div style={toolbar}>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(locale, "customersSearchPlaceholder")}
          style={searchInput}
        />
        <button
          type="button"
          disabled={catalog.loading || catalog.refreshing}
          onClick={() => void refreshClients({ silent: false, locale })}
          style={retryBtn}
        >
          {catalog.refreshing || catalog.loading
            ? t(locale, "loading")
            : t(locale, "customersRefresh")}
        </button>
      </div>

      {!loading && !catalog.error ? (
        <section style={summaryGrid} aria-label={t(locale, "customersTitle")}>
          <SummaryCell
            label={t(locale, "customersSummaryTotal")}
            value={String(catalog.clients.length)}
          />
          <SummaryCell
            label={t(locale, "customersSummaryShown")}
            value={String(clients.length)}
            emphasize
          />
          <SummaryCell
            label={t(locale, "customersSummaryWithPhone")}
            value={String(catalog.clients.filter((c) => Boolean(c.telephone?.trim())).length)}
          />
        </section>
      ) : null}

      {catalog.error ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13, flex: "1 1 200px" }}>
            {catalog.error}
          </p>
          <button
            type="button"
            onClick={() => void refreshClients({ silent: false, locale })}
            style={retryBtn}
          >
            {t(locale, "customersRetry")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <ClientListSkeleton rows={10} />
      ) : clients.length === 0 ? (
        <p style={{ margin: 0, color: "var(--tek-ash)" }}>
          {t(locale, query.trim() ? "customersEmptyFilter" : "customersEmpty")}
        </p>
      ) : (
        <div
          role="listbox"
          tabIndex={0}
          onKeyDown={onListKeyDown}
          style={{ outline: "none" }}
        >
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "left" }}>{t(locale, "customersColName")}</th>
                  <th style={{ ...th, textAlign: "left" }}>{t(locale, "customersColPhone")}</th>
                  <th style={{ ...th, textAlign: "left" }}>{t(locale, "customersColEmail")}</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const active = selected?.id === client.id;
                  return (
                    <tr
                      key={client.id}
                      role="option"
                      aria-selected={active}
                      onClick={() => void openDetail(client)}
                      style={{
                        ...row,
                        background: active ? "rgba(244, 198, 15, 0.22)" : undefined,
                      }}
                    >
                      <td style={{ ...td, fontWeight: 650 }}>
                        {client.nom?.trim() || t(locale, "customersNoName")}
                      </td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                        {client.telephone?.trim() || "—"}
                      </td>
                      <td style={td}>{client.email?.trim() || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected ? (
        <ClientDetailModal
          locale={locale}
          currency={currency}
          loading={detailLoading}
          error={detailError}
          client={detailClient ?? selected}
          stats={stats}
          onClose={closeDetail}
        />
      ) : null}
    </div>
  );
}

function ClientDetailModal({
  locale,
  currency,
  loading,
  error,
  client,
  stats,
  onClose,
}: {
  locale: AppLocale;
  currency?: string | null;
  loading: boolean;
  error: string | null;
  client: Client;
  stats: ClientStats | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div role="presentation" style={backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-detail-title"
        tabIndex={-1}
        style={dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={dialogHeader}>
          <div>
            <p style={eyebrow}>{t(locale, "customersTitle")}</p>
            <h2 id="customer-detail-title" style={{ margin: "4px 0 0", fontSize: 22 }}>
              {client.nom?.trim() || t(locale, "customersNoName")}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={ghostBtn}>
            Esc
          </button>
        </header>

        {loading ? (
          <SaleDetailSkeleton />
        ) : (
          <>
            <div style={metaGrid}>
              <Meta
                label={t(locale, "customersColPhone")}
                value={client.telephone?.trim() || "—"}
              />
              <Meta label={t(locale, "customersColEmail")} value={client.email?.trim() || "—"} />
              <Meta
                label={t(locale, "customersColAddress")}
                value={client.adresse?.trim() || "—"}
              />
            </div>

            {error ? (
              <p style={{ margin: "14px 0 0", color: "var(--tek-danger)", fontSize: 13 }}>
                {error}
              </p>
            ) : null}

            {stats ? (
              <>
                <h3 style={{ margin: "18px 0 10px", fontSize: 14 }}>
                  {t(locale, "customersStatsTitle")}
                </h3>
                <div style={metaGrid}>
                  <Meta
                    label={t(locale, "customersStatsSales")}
                    value={String(stats.ventes_count)}
                  />
                  <Meta
                    label={t(locale, "customersStatsRevenue")}
                    value={formatPrice(stats.montant_ventes, locale, currency)}
                  />
                  <Meta
                    label={t(locale, "customersStatsPaid")}
                    value={formatPrice(stats.montant_paye, locale, currency)}
                  />
                  <Meta
                    label={t(locale, "customersStatsRemaining")}
                    value={formatPrice(stats.montant_restant, locale, currency)}
                  />
                  <Meta
                    label={t(locale, "customersStatsLastSale")}
                    value={formatWhen(locale, stats.derniere_vente_at)}
                  />
                  <Meta
                    label={t(locale, "customersStatsPoints")}
                    value={String(stats.solde_points_fidelite ?? 0)}
                  />
                </div>
              </>
            ) : !error && !loading ? (
              <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--tek-ash)" }}>
                {client.id.startsWith("local:")
                  ? t(locale, "customersLocalOnly")
                  : t(locale, "customersStatsUnavailable")}
              </p>
            ) : null}

            <div style={{ marginTop: 18 }}>
              <button type="button" onClick={onClose} style={cancelBtn}>
                {t(locale, "customersDetailClose")}
              </button>
            </div>
          </>
        )}
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

const searchInput: CSSProperties = {
  flex: "1 1 240px",
  maxWidth: 420,
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "12px 14px",
  background: "var(--tek-card)",
  color: "var(--tek-ink)",
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

const tableWrap: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 14,
  overflow: "auto",
  background: "var(--tek-card)",
  maxHeight: "min(62vh, 640px)",
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
  width: "min(560px, 100%)",
  maxHeight: "min(90vh, 720px)",
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

const cancelBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 14,
  padding: "12px 16px",
  background: "transparent",
  color: "var(--tek-ash)",
  fontWeight: 650,
  fontSize: 14,
  cursor: "pointer",
};
