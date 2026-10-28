import type { Client, ClientWritePayload } from "@teka/shared";
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

function asClient(payload: unknown): Client {
  if (!payload || typeof payload !== "object") {
    throw new Error("Réponse client invalide");
  }
  const obj = payload as Record<string, unknown>;
  if (obj.client && typeof obj.client === "object") return obj.client as Client;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Client;
  }
  if ("id" in obj) return obj as unknown as Client;
  throw new Error("Réponse client invalide");
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

export async function createClient(payload: ClientWritePayload): Promise<Client> {
  const body = {
    nom: payload.nom?.trim() || null,
    telephone: payload.telephone.trim(),
    email: payload.email?.trim() || null,
    adresse: payload.adresse?.trim() || null,
    notes: payload.notes?.trim() || null,
  };
  const response = await apiRequest<unknown>("/api/clients", {
    method: "POST",
    body,
  });
  return asClient(response);
}

export async function updateClient(
  clientId: string,
  payload: Partial<ClientWritePayload> & { actif?: boolean },
): Promise<Client> {
  const body: Record<string, unknown> = {};
  if (payload.nom !== undefined) body.nom = payload.nom?.trim() || null;
  if (payload.telephone !== undefined) body.telephone = payload.telephone.trim();
  if (payload.email !== undefined) body.email = payload.email?.trim() || null;
  if (payload.adresse !== undefined) body.adresse = payload.adresse?.trim() || null;
  if (payload.notes !== undefined) body.notes = payload.notes?.trim() || null;
  if (typeof payload.actif === "boolean") body.actif = payload.actif;

  const response = await apiRequest<unknown>(`/api/clients/${clientId}`, {
    method: "PATCH",
    body,
  });
  return asClient(response);
}
