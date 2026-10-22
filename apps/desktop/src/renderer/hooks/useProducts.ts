import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppLocale, Product } from "@teka/shared";
import { friendlyProductsError } from "../i18n/messages";

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

function isTransientNetworkError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return /TEKA_NET:NETWORK_CHANGED|ERR_NETWORK_CHANGED|NETWORK_CHANGED/i.test(raw);
}

/**
 * Précharge le catalogue une fois (GET /api/produits), puis filtre en local.
 * Un seul appel — évite la boucle de pages qui multiplie les timeouts réseau.
 */
export function useProducts(search: string, locale: AppLocale, enabled = true) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!window.teka) return;
    setLoading(true);
    setError(null);
    try {
      const load = () =>
        window.teka!.listProducts({
          type: "produit",
          per_page: 200,
          page: 1,
          actif: true,
        });

      let list: Product[];
      try {
        list = await load();
      } catch (first) {
        // Changement Wi‑Fi / interface : un second essai après une courte pause.
        if (!isTransientNetworkError(first)) throw first;
        await new Promise((r) => window.setTimeout(r, 800));
        list = await load();
      }

      setAllProducts(list);
    } catch (err) {
      setAllProducts([]);
      setError(friendlyProductsError(locale, err));
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
