import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppLocale, Product } from "@teka/shared";

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

async function fetchAllProducts(): Promise<Product[]> {
  if (!window.teka) return [];

  const perPage = 100;
  const all: Product[] = [];
  let page = 1;

  // Une seule charge initiale (comme le web), pas de recherche API à chaque frappe.
  while (page <= 50) {
    const batch = await window.teka.listProducts({
      type: "produit",
      per_page: perPage,
      page,
      actif: true,
    });
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }

  return all;
}

/**
 * Précharge le catalogue une fois, puis filtre en local sur `search`.
 * Évite le debounce API lent du POS / scanner.
 */
export function useProducts(search: string, enabled = true) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!window.teka) return;
    setLoading(true);
    setError(null);
    try {
      setAllProducts(await fetchAllProducts());
    } catch (err) {
      setAllProducts([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const products = useMemo(
    () => filterProducts(allProducts, search),
    [allProducts, search],
  );

  return { products, allProducts, loading, error, reload };
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
    // devise invalide pour Intl → fallback texte
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
