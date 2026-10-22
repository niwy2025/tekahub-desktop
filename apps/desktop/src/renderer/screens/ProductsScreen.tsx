import { useState, type CSSProperties } from "react";
import type { AppLocale } from "@teka/shared";
import { ProductListSkeleton } from "../components/Skeleton";
import { formatPrice, useProducts } from "../hooks/useProducts";
import { t } from "../i18n/messages";

export function ProductsScreen({
  locale,
  currency,
}: {
  locale: AppLocale;
  currency?: string | null;
}) {
  const [query, setQuery] = useState("");
  const { products, loading, error } = useProducts(query);

  return (
    <div style={{ padding: 28, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, "productsTitle")}</h1>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t(locale, "posSearchPlaceholder")}
        style={searchInput}
      />

      {error ? (
        <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13 }}>{error}</p>
      ) : null}

      {loading ? (
        <ProductListSkeleton rows={8} />
      ) : products.length === 0 ? (
        <p style={{ color: "var(--tek-ash)" }}>{t(locale, "productsEmpty")}</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {products.map((product) => (
            <div key={product.id} style={row}>
              <div>
                <strong>{product.nom}</strong>
                <div style={{ fontSize: 12, color: "var(--tek-ash)", marginTop: 2 }}>
                  {[product.sku, product.code_barre, product.categorie?.nom]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 700 }}>
                {formatPrice(product.prix_vente_ttc ?? product.prix_vente, locale, currency)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const searchInput: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "12px 14px",
  background: "var(--tek-card)",
};

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
};
