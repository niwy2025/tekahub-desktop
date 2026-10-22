import type { Product, ProductListQuery } from "@teka/shared";
import { apiRequest } from "./api-client";

function asProductArray(payload: unknown): Product[] {
  if (Array.isArray(payload)) return payload as Product[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.data)) return obj.data as Product[];

  if (obj.data && typeof obj.data === "object") {
    const nested = obj.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data as Product[];
  }

  if (Array.isArray(obj.produits)) return obj.produits as Product[];

  if (obj.produits && typeof obj.produits === "object") {
    const wrapped = obj.produits as Record<string, unknown>;
    if (Array.isArray(wrapped.data)) return wrapped.data as Product[];
  }

  return [];
}

/**
 * Même route que le front web (`listProductsPaginated` → GET /api/produits).
 * Query alignée sur products/page.tsx : type, search, page, per_page, actif.
 */
export async function listProducts(query: ProductListQuery = {}): Promise<Product[]> {
  const payload = await apiRequest<unknown>("/api/produits", {
    method: "GET",
    query: {
      type: query.type ?? "produit",
      search: query.search?.trim() || undefined,
      per_page: query.per_page ?? 50,
      page: query.page ?? 1,
      actif: query.actif === undefined ? true : query.actif,
    },
  });
  return asProductArray(payload);
}
