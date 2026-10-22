import { useCallback, useEffect, useState } from "react";
import type { AppLocale, Product } from "@teka/shared";

/** Même source que le front web : GET /api/produits */
export function useProducts(search: string, enabled = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (q: string) => {
    if (!window.teka) return;
    setLoading(true);
    setError(null);
    try {
      const list = await window.teka.listProducts({
        type: "produit",
        search: q || undefined,
        per_page: 50,
        page: 1,
        actif: true,
      });
      setProducts(list);
    } catch (err) {
      setProducts([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handle = window.setTimeout(() => {
      void reload(search.trim());
    }, 250);
    return () => window.clearTimeout(handle);
  }, [enabled, search, reload]);

  return { products, loading, error, reload: () => void reload(search.trim()) };
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
