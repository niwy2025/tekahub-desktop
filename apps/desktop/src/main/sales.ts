import {
  canCancelSales,
  type CancelSalePayload,
  type CreateSalePayload,
  type RecordSalePaymentPayload,
  type Sale,
  type SaleClientCheckPayload,
  type SaleClientCheckResponse,
  type SaleDetailResponse,
  type SaleHistoryQuery,
  type SaleHistoryResponse,
} from "@teka/shared";
import { ApiError, apiRequest } from "./api-client";
import {
  enqueueOfflineSale,
  flushOfflineQueue,
  isNetworkFailure,
} from "./offline-queue";
import { getCachedUser } from "./session";

export async function checkSaleClient(
  payload: SaleClientCheckPayload,
): Promise<SaleClientCheckResponse> {
  return apiRequest<SaleClientCheckResponse>("/api/ventes/client/check", {
    method: "POST",
    body: payload,
  });
}

export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  try {
    const data = await apiRequest<Sale | { data?: Sale; vente?: Sale; sale?: Sale }>(
      "/api/ventes",
      {
        method: "POST",
        body: payload,
      },
    );

    let sale: Sale;
    if (data && typeof data === "object") {
      if ("data" in data && data.data) sale = data.data;
      else if ("vente" in data && data.vente) sale = data.vente;
      else if ("sale" in data && data.sale) sale = data.sale;
      else sale = data as Sale;
    } else {
      sale = data as Sale;
    }

    // Après une vente online, tenter d’évacuer la file hors-ligne.
    void flushOfflineQueue().catch(() => undefined);
    return sale;
  } catch (err) {
    if (isNetworkFailure(err)) {
      return enqueueOfflineSale(payload);
    }
    throw err;
  }
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

/** Encaisser un complément sur une vente partielle. */
export async function recordSalePayment(payload: RecordSalePaymentPayload): Promise<Sale> {
  const hasFx =
    Boolean(payload.devise_paiement?.trim()) ||
    (payload.montant_recu_devise != null && Number(payload.montant_recu_devise) > 0);

  const body: Record<string, unknown> = {
    moyen_paiement: payload.moyen_paiement ?? "especes",
    notes: payload.notes ?? undefined,
  };

  if (hasFx) {
    body.devise_paiement = payload.devise_paiement?.trim() || undefined;
    body.montant_recu_devise = payload.montant_recu_devise;
    if (payload.montant != null && Number.isFinite(payload.montant) && payload.montant > 0) {
      body.montant = payload.montant;
    }
  } else {
    body.montant = payload.montant;
  }

  const data = await apiRequest<Sale | { data?: Sale }>(
    `/api/ventes/${payload.saleId}/paiements`,
    {
      method: "POST",
      body,
    },
  );

  if (data && typeof data === "object" && "data" in data && data.data) {
    return data.data;
  }
  return data as Sale;
}

/** Soft-cancel POS : statut annulee (restaure stock côté API). Réservé admin/manager/gérant. */
export async function cancelSale(payload: CancelSalePayload): Promise<Sale> {
  if (!canCancelSales(getCachedUser())) {
    throw new ApiError("Seuls les administrateurs peuvent annuler une vente.", 403, {
      message: "Seuls les administrateurs peuvent annuler une vente.",
    });
  }

  const data = await apiRequest<Sale | { data?: Sale }>(`/api/ventes/${payload.saleId}`, {
    method: "PUT",
    body: {
      statut: "annulee",
      moyen_paiement: payload.moyen_paiement ?? "especes",
      client_id: payload.client_id ?? undefined,
      client_nom: payload.client_nom ?? undefined,
      client_telephone: payload.client_telephone ?? undefined,
      lignes: payload.lignes,
    },
  });

  if (data && typeof data === "object" && "data" in data && data.data) {
    return data.data;
  }
  return data as Sale;
}
