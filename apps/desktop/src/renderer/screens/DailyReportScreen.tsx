import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { AppLocale, DailyReport } from "@teka/shared";
import { formatPrice } from "../hooks/useProducts";
import { friendlyNetworkError, t } from "../i18n/messages";

type Props = {
  locale: AppLocale;
  currency?: string | null;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DailyReportScreen({ locale, currency }: Props) {
  const [date, setDate] = useState(todayIso);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!window.teka?.getDailyReport) {
      setError(t(locale, "reportLoadError"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await window.teka.getDailyReport({ date });
      setReport(next);
    } catch (err) {
      setReport(null);
      setError(friendlyNetworkError(locale, err, "reportLoadError"));
    } finally {
      setLoading(false);
    }
  }, [date, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const cur = currency ?? report?.currency ?? null;
  const summary = report?.summary;

  return (
    <div style={{ padding: 28, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, "reportTitle")}</h1>
          <p style={{ margin: "8px 0 0", color: "var(--tek-ash)", fontSize: 14 }}>
            {t(locale, "reportHint")}
          </p>
        </div>
        <label style={dateLabel}>
          {t(locale, "reportDate")}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={dateInput}
          />
        </label>
        <button type="button" onClick={() => void load()} style={refreshBtn} disabled={loading}>
          {loading ? t(locale, "loading") : t(locale, "reportRefresh")}
        </button>
      </div>

      {error ? (
        <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 14 }}>{error}</p>
      ) : null}

      {summary ? (
        <div style={statsGrid}>
          <Stat
            label={t(locale, "reportSalesCount")}
            value={String(summary.sales_count)}
          />
          <Stat
            label={t(locale, "reportCashTotal")}
            value={formatPrice(summary.cash_sales_total ?? 0, locale, cur)}
          />
          <Stat
            label={t(locale, "reportSalesTotal")}
            value={formatPrice(summary.sales_total, locale, cur)}
          />
          <Stat
            label={t(locale, "reportNetTotal")}
            value={formatPrice(summary.net_total, locale, cur)}
          />
        </div>
      ) : null}

      {summary ? (
        <div style={detailGrid}>
          <Panel title={t(locale, "reportBreakdown")}>
            <Row
              label={t(locale, "reportProducts")}
              value={formatPrice(summary.product_sales_total, locale, cur)}
            />
            <Row
              label={t(locale, "reportServices")}
              value={formatPrice(summary.service_sales_total, locale, cur)}
            />
            <Row
              label={t(locale, "reportItemsQty")}
              value={String(summary.items_quantity)}
            />
            <Row
              label={t(locale, "reportExpenses")}
              value={formatPrice(summary.expenses_total, locale, cur)}
            />
          </Panel>

          <Panel title={t(locale, "reportSalesList")}>
            {!report?.sales?.length ? (
              <p style={{ margin: 0, color: "var(--tek-ash)", fontSize: 13 }}>
                {t(locale, "reportNoSales")}
              </p>
            ) : (
              <div style={{ overflow: "auto", maxHeight: 360 }}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>{t(locale, "reportColRef")}</th>
                      <th style={th}>{t(locale, "reportColClient")}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t(locale, "reportColPay")}</th>
                      <th style={{ ...th, textAlign: "right" }}>{t(locale, "reportColAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td style={td}>{sale.reference || sale.id.slice(0, 8)}</td>
                        <td style={td}>{sale.client || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {sale.payment_method || "—"}
                        </td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>
                          {formatPrice(sale.amount, locale, cur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {!loading && !error && !summary ? (
        <p style={{ color: "var(--tek-ash)" }}>{t(locale, "reportNoSales")}</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 12, color: "var(--tek-ash)", fontWeight: 650 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={panel}>
      <h2 style={{ margin: "0 0 12px", fontSize: 16 }}>{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid var(--tek-line)",
        fontSize: 14,
      }}
    >
      <span style={{ color: "var(--tek-ash)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const dateLabel: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  fontWeight: 650,
  color: "var(--tek-ash)",
};

const dateInput: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  background: "var(--tek-card)",
  color: "var(--tek-ink)",
};

const refreshBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "10px 14px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 750,
  fontSize: 13,
  cursor: "pointer",
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const statCard: CSSProperties = {
  background: "var(--tek-card)",
  border: "1px solid var(--tek-line)",
  borderRadius: 16,
  padding: 16,
};

const detailGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 0.9fr) minmax(0, 1.4fr)",
  gap: 16,
};

const panel: CSSProperties = {
  background: "var(--tek-card)",
  border: "1px solid var(--tek-line)",
  borderRadius: 16,
  padding: 16,
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: "1px solid var(--tek-line)",
  color: "var(--tek-ash)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const td: CSSProperties = {
  padding: "8px 6px",
  borderBottom: "1px solid var(--tek-line)",
};
