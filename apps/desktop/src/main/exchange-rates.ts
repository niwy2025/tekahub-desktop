import type { EnterpriseExchangeRatesResponse } from "@teka/shared";
import { apiRequest } from "./api-client";

export async function getEnterpriseExchangeRates(): Promise<EnterpriseExchangeRatesResponse> {
  const payload = await apiRequest<
    EnterpriseExchangeRatesResponse | { data?: EnterpriseExchangeRatesResponse }
  >("/api/entreprise/exchange-rates", { method: "GET" });

  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return normalize(payload.data);
  }
  return normalize(payload as EnterpriseExchangeRatesResponse);
}

function normalize(
  raw: EnterpriseExchangeRatesResponse | null | undefined,
): EnterpriseExchangeRatesResponse {
  const rates = Array.isArray(raw?.rates)
    ? raw.rates
        .filter((rate) => rate && typeof rate.devise === "string" && Number(rate.taux) > 0)
        .map((rate) => ({
          id: rate.id,
          devise: String(rate.devise).trim().toUpperCase(),
          taux: Number(rate.taux),
          actif: rate.actif !== false,
        }))
        .filter((rate) => rate.actif)
    : [];

  return {
    enabled: Boolean(raw?.enabled),
    devise_principale: String(raw?.devise_principale ?? "").trim().toUpperCase() || "CDF",
    supported_currencies: Array.isArray(raw?.supported_currencies)
      ? raw.supported_currencies.map((c) => String(c).trim().toUpperCase())
      : [],
    rates,
  };
}
