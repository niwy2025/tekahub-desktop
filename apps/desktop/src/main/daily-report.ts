import type { DailyReport, DailyReportQuery } from "@teka/shared";
import { apiRequest } from "./api-client";

function asNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rapport journalier POS : GET /api/pos/v1/reports/daily
 * Ajoute cash_sales_total (somme des ventes espèces).
 */
export async function getDailyReport(query: DailyReportQuery = {}): Promise<DailyReport> {
  const payload = await apiRequest<DailyReport>("/api/pos/v1/reports/daily", {
    method: "GET",
    query: {
      date: query.date?.trim() || undefined,
      scope: query.scope || undefined,
      branche_id: query.branche_id || undefined,
    },
  });

  const sales = Array.isArray(payload?.sales) ? payload.sales : [];
  const cashSalesTotal = sales
    .filter((row) => (row.payment_method ?? "especes") === "especes")
    .reduce((sum, row) => sum + asNumber(row.amount), 0);

  const summary = payload?.summary ?? {
    sales_count: 0,
    items_quantity: 0,
    product_sales_total: 0,
    service_sales_total: 0,
    sales_total: 0,
    expenses_total: 0,
    net_total: 0,
  };

  return {
    ...payload,
    date: payload?.date ?? query.date ?? new Date().toISOString().slice(0, 10),
    summary: {
      ...summary,
      sales_count: asNumber(summary.sales_count),
      items_quantity: asNumber(summary.items_quantity),
      product_sales_total: asNumber(summary.product_sales_total),
      service_sales_total: asNumber(summary.service_sales_total),
      sales_total: asNumber(summary.sales_total),
      expenses_total: asNumber(summary.expenses_total),
      net_total: asNumber(summary.net_total),
      cash_sales_total: Math.round(cashSalesTotal * 100) / 100,
    },
    sales,
    items: Array.isArray(payload?.items) ? payload.items : [],
    expenses: Array.isArray(payload?.expenses) ? payload.expenses : [],
    sales_by_type: Array.isArray(payload?.sales_by_type) ? payload.sales_by_type : [],
  };
}
