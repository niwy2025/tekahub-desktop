import type { Client, ClientStatsResponse } from "@teka/shared";
import { apiRequest } from "./api-client";

function asClientArray(payload: unknown): Client[] {
  if (Array.isArray(payload)) return payload as Client[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data as Client[];
  if (Array.isArray(obj.clients)) return obj.clients as Client[];

  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as Client[];
  }

  return [];
}

/** Précharge tous les clients (pagination max 100 / page). */
export async function listAllClients(): Promise<Client[]> {
  const perPage = 100;
  const all: Client[] = [];
  let page = 1;

  while (page <= 50) {
    const payload = await apiRequest<unknown>("/api/clients", {
      method: "GET",
      query: { per_page: perPage, page },
    });
    const batch = asClientArray(payload);
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return all;
}

export async function getClientStats(clientId: string): Promise<ClientStatsResponse> {
  return apiRequest<ClientStatsResponse>(`/api/clients/${clientId}/stats`, {
    method: "GET",
  });
}
