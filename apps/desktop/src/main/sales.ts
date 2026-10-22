import type {
  CreateSalePayload,
  Sale,
  SaleClientCheckPayload,
  SaleClientCheckResponse,
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
