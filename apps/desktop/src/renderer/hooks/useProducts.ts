import { useMemo, useSyncExternalStore } from "react";
import type { AppLocale, Product } from "@teka/shared";
import {
  getCatalogSnapshot,
  refreshCatalog,
  subscribeCatalog,
} from "../catalog/productCatalogStore";

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

/** Filtre local — même logique que sales/new du front web. */
export function filterProducts(products: Product[], search: string): Product[] {
  const query = normalizeText(search);
  if (!query) return products;
  return products.filter((product) =>
    [product.nom, product.sku, product.code_barre, product.categorie?.nom]
      .filter(Boolean)
      .some((value) => normalizeText(String(value)).includes(query)),
  );
}

/**
 * Lit le catalogue partagé (chargé au login, refresh ~10 min en arrière-plan).
 * Ne refetch PAS à chaque visite de la caisse / écran produits.
 */
export function useProducts(search: string, _locale: AppLocale, _enabled = true) {
  const catalog = useSyncExternalStore(subscribeCatalog, getCatalogSnapshot, getCatalogSnapshot);

  const products = useMemo(
    () => filterProducts(catalog.products, search),
    [catalog.products, search],
  );

  return {
    products,
    allProducts: catalog.products,
    loading: catalog.loading && catalog.products.length === 0,
    refreshing: catalog.refreshing,
    error: catalog.error,
    reload: () => void refreshCatalog({ silent: false }),
    lastFetchedAt: catalog.lastFetchedAt,
  };
}

/**
 * Affichage prix + devise entreprise — même logique que products/page.tsx du front.
 */
export function formatPrice(
  value: number | string | null | undefined,
  locale: AppLocale,
  currency?: string | null,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);

  const code = currency?.trim() || null;
  try {
    if (code) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
      }).format(n);
    }
  } catch {
    return `${n.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} ${code}`;
  }

  return n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
