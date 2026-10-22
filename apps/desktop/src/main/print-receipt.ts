import { BrowserWindow } from "electron";
import type { AppLocale, SaleReceiptPayload } from "@teka/shared";
import { getPrinterSettings } from "./printer-settings";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(locale: AppLocale, currency: string | null | undefined, value: number): string {
  try {
    if (currency) {
      return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
    }
  } catch {
    // fall through
  }
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatWhen(locale: AppLocale, value?: string | null): string {
  if (!value) return new Date().toLocaleString(locale);
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

function labels(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "SALE RECEIPT",
      ref: "Ref",
      date: "Date",
      client: "Customer",
      counter: "Counter sale",
      qty: "Qty",
      total: "TOTAL",
      paid: "Paid",
      cash: "Cash received",
      change: "Change",
      thanks: "Thank you",
      payment: "Payment",
      method: {
        especes: "Cash",
        mobile_money: "Mobile money",
        carte_bancaire: "Card",
        virement: "Transfer",
        autre: "Other",
      },
    };
  }
  return {
    title: "TICKET DE VENTE",
    ref: "Réf",
    date: "Date",
    client: "Client",
    counter: "Vente comptoir",
    qty: "Qté",
    total: "TOTAL",
    paid: "Payé",
    cash: "Espèces reçues",
    change: "À rendre",
    thanks: "Merci",
    payment: "Paiement",
    method: {
      especes: "Espèces",
      mobile_money: "Mobile money",
      carte_bancaire: "Carte",
      virement: "Virement",
      autre: "Autre",
    },
  };
}

function paymentMethodLabel(
  locale: AppLocale,
  moyen?: string | null,
): string {
  const L = labels(locale);
  const key = (moyen ?? "especes") as keyof typeof L.method;
  return L.method[key] ?? moyen ?? L.method.especes;
}

export function buildReceiptHtml(payload: SaleReceiptPayload): string {
  const L = labels(payload.locale);
  const currency = payload.currency ?? payload.sale.devise_principale ?? null;
  const total = Number(payload.sale.montant_total ?? 0) || 0;
  const paid = Number(payload.sale.montant_paye ?? total) || total;
  const client =
    [payload.sale.client_nom, payload.sale.client_telephone].filter(Boolean).join(" · ") ||
    L.counter;

  const rows = payload.lines
    .map(
      (line) => `
      <tr>
        <td class="name">${escapeHtml(line.nom)}</td>
        <td class="num">${line.qty}</td>
        <td class="num">${escapeHtml(money(payload.locale, currency, line.unit))}</td>
        <td class="num">${escapeHtml(money(payload.locale, currency, line.total))}</td>
      </tr>`,
    )
    .join("");

  const cashBlock =
    payload.cashReceived != null && payload.cashReceived > 0
      ? `<div class="row"><span>${L.cash}</span><span>${escapeHtml(
          money(payload.locale, currency, payload.cashReceived),
        )}</span></div>
         <div class="row"><span>${L.change}</span><span>${escapeHtml(
           money(payload.locale, currency, payload.changeDue ?? 0),
         )}</span></div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 8px 10px 16px;
      width: 80mm;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #000;
    }
    h1 { font-size: 14px; margin: 0 0 6px; text-align: center; }
    .muted { color: #333; text-align: center; margin: 0 0 8px; font-size: 10px; }
    .rule { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 2px 0; vertical-align: top; }
    th { font-size: 9px; text-align: left; border-bottom: 1px solid #000; }
    td.name { width: 46%; word-break: break-word; }
    td.num { text-align: right; white-space: nowrap; }
    .total { font-size: 13px; font-weight: 800; margin-top: 6px; }
    .thanks { text-align: center; margin-top: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <h1>${escapeHtml(payload.companyName || "TekaHub")}</h1>
  ${payload.branchName ? `<p class="muted">${escapeHtml(payload.branchName)}</p>` : ""}
  <p class="muted">${L.title}</p>
  <div class="rule"></div>
  <div class="row"><span>${L.ref}</span><span>${escapeHtml(payload.sale.reference || payload.sale.id)}</span></div>
  <div class="row"><span>${L.date}</span><span>${escapeHtml(formatWhen(payload.locale, payload.sale.date_vente))}</span></div>
  <div class="row"><span>${L.client}</span><span>${escapeHtml(client)}</span></div>
  <div class="row"><span>${L.payment}</span><span>${escapeHtml(
    paymentMethodLabel(payload.locale, payload.sale.moyen_paiement),
  )}</span></div>
  <div class="rule"></div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:right">${L.qty}</th>
        <th style="text-align:right">P.U.</th>
        <th style="text-align:right">${L.total}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="rule"></div>
  <div class="row total"><span>${L.total}</span><span>${escapeHtml(
    money(payload.locale, currency, total),
  )}</span></div>
  <div class="row"><span>${L.paid}</span><span>${escapeHtml(
    money(payload.locale, currency, paid),
  )}</span></div>
  ${cashBlock}
  <p class="thanks">${L.thanks}</p>
</body>
</html>`;
}

/**
 * Impression ticket 80 mm via fenêtre cachée.
 * Ne fait pas échouer la vente si l’imprimante est indisponible.
 */
export async function printSaleReceipt(payload: SaleReceiptPayload): Promise<{ ok: boolean; error?: string }> {
  const settings = getPrinterSettings();
  const html = buildReceiptHtml(payload);

  const win = new BrowserWindow({
    show: false,
    width: 320,
    height: 600,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("print-timeout")), 20000);
      win.webContents.print(
        {
          silent: settings.silentPrint,
          printBackground: false,
          deviceName: settings.printerName || undefined,
          margins: { marginType: "none" },
        },
        (success, failureReason) => {
          clearTimeout(timer);
          if (!success) {
            reject(new Error(failureReason || "print-failed"));
            return;
          }
          resolve();
        },
      );
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}
