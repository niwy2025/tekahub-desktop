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
  const { products, loading, error, reload } = useProducts(query, locale);

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13, flex: "1 1 200px" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => void reload()}
            style={{
              border: "1px solid var(--tek-line)",
              borderRadius: 10,
              padding: "8px 14px",
              background: "var(--tek-yellow)",
              color: "var(--tek-black)",
              fontWeight: 650,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {t(locale, "productsRetry")}
          </button>
        </div>
      ) : null}

      {loading ? (
        <ProductListSkeleton rows={12} />
      ) : products.length === 0 ? (
        <p style={{ color: "var(--tek-ash)" }}>{t(locale, "productsEmpty")}</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {products.map((product) => (
            <div key={product.id} style={card}>
              <strong
                style={{
                  fontSize: 14,
                  lineHeight: 1.3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  minHeight: "2.6em",
                }}
              >
                {product.nom}
              </strong>
              <div style={{ fontSize: 11, color: "var(--tek-ash)", marginTop: 6 }}>
                {[product.sku, product.code_barre, product.categorie?.nom]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
              <div style={{ marginTop: "auto", paddingTop: 10, fontWeight: 700, fontSize: 15 }}>
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

const card: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: 14,
  borderRadius: 14,
  border: "1px solid var(--tek-line)",
  background: "var(--tek-card)",
  minHeight: 120,
};
