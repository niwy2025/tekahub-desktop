import type {
  CreateSalePayload,
  Sale,
  SaleClientCheckPayload,
  SaleClientCheckResponse,
  SaleDetailResponse,
  SaleHistoryQuery,
  SaleHistoryResponse,
} from "@teka/shared";
import { apiRequest } from "./api-client";

export async function checkSaleClient(
  payload: SaleClientCheckPayload,
): Promise<SaleClientCheckResponse> {
  return apiRequest<SaleClientCheckResponse>("/api/ventes/client/check", {
    method: "POST",
    body: payload,
  });
}

export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  const data = await apiRequest<Sale | { data?: Sale; vente?: Sale; sale?: Sale }>(
    "/api/ventes",
    {
      method: "POST",
      body: payload,
    },
  );

  if (data && typeof data === "object") {
    if ("data" in data && data.data) return data.data;
    if ("vente" in data && data.vente) return data.vente;
    if ("sale" in data && data.sale) return data.sale;
  }
  return data as Sale;
}

/** Historique POS de l’utilisateur connecté, groupé par jour. */
export async function listSaleHistory(
  query: SaleHistoryQuery = {},
): Promise<SaleHistoryResponse> {
  const payload = await apiRequest<SaleHistoryResponse>("/api/pos/v1/ventes/historique", {
    method: "GET",
    query: {
      limit: query.limit ?? 100,
      date_from: query.date_from ?? undefined,
      date_to: query.date_to ?? undefined,
    },
  });

  return {
    server_time: payload?.server_time,
    timezone: payload?.timezone,
    groups: Array.isArray(payload?.groups) ? payload.groups : [],
    meta: payload?.meta,
  };
}

export async function getSaleDetail(saleId: string): Promise<Sale> {
  const payload = await apiRequest<SaleDetailResponse | Sale>(
    `/api/pos/v1/ventes/${saleId}/details`,
    { method: "GET" },
  );

  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data;
  }
  return payload as Sale;
}
