import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { AppLocale, Product } from "@teka/shared";
import { CartPanel, type CartLine } from "../components/CartPanel";
import { ProductListSkeleton } from "../components/Skeleton";
import { formatPrice, useProducts } from "../hooks/useProducts";
import { useAutoFocus } from "../keyboard/useAutoFocus";
import { t } from "../i18n/messages";

export function PosScreen({
  locale,
  currency,
  searchRefExternal,
}: {
  locale: AppLocale;
  currency?: string | null;
  searchRefExternal?: RefObject<HTMLInputElement | null>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const searchRef = searchRefExternal ?? localRef;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  useAutoFocus(searchRef);

  const { products, loading, error } = useProducts(query);

  useEffect(() => {
    if (products.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!products.some((p) => p.id === selectedId)) {
      setSelectedId(products[0].id);
    }
  }, [products, selectedId]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setSelectedId(product.id);
    searchRef.current?.focus();
  }

  function increment(productId: string) {
    setCart((prev) =>
      prev.map((line) =>
        line.product.id === productId ? { ...line, qty: line.qty + 1 } : line,
      ),
    );
  }

  function decrement(productId: string) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.product.id === productId ? { ...line, qty: line.qty - 1 } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown" && products.length > 0) {
      e.preventDefault();
      const idx = products.findIndex((p) => p.id === selectedId);
      const next = products[Math.min(products.length - 1, Math.max(0, idx + 1))];
      setSelectedId(next.id);
      return;
    }
    if (e.key === "ArrowUp" && products.length > 0) {
      e.preventDefault();
      const idx = products.findIndex((p) => p.id === selectedId);
      const next = products[Math.max(0, idx <= 0 ? 0 : idx - 1)];
      setSelectedId(next.id);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target =
        products.find((p) => p.id === selectedId) ??
        (products.length === 1 ? products[0] : null);
      if (target) addToCart(target);
    }
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 16, height: "100%" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>{t(locale, "posTitle")}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
          gap: 16,
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        <section style={panel}>
          <label style={labelStyle}>{t(locale, "posSearch")}</label>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={t(locale, "posSearchPlaceholder")}
            autoComplete="off"
            style={searchInput}
          />

          {error ? (
            <p style={{ margin: "12px 0 0", color: "var(--tek-danger)", fontSize: 13 }}>{error}</p>
          ) : null}

          <div
            role="listbox"
            aria-label={t(locale, "posTitle")}
            style={{ marginTop: 14, maxHeight: "calc(100vh - 260px)", overflow: "auto" }}
          >
            {loading ? (
              <ProductListSkeleton rows={7} />
            ) : products.length === 0 ? (
              <p style={{ color: "var(--tek-ash)", fontSize: 14 }}>{t(locale, "productsEmpty")}</p>
            ) : (
              products.map((product) => {
                const active = product.id === selectedId;
                const price = product.prix_vente_ttc ?? product.prix_vente;
                return (
                  <button
                    key={product.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => addToCart(product)}
                    onFocus={() => setSelectedId(product.id)}
                    style={{
                      ...productRow,
                      borderColor: active ? "var(--tek-black)" : "var(--tek-line)",
                      background: active ? "rgba(244, 198, 15, 0.18)" : "var(--tek-bg)",
                    }}
                  >
                    <div>
                      <strong>{product.nom}</strong>
                      <div style={{ fontSize: 12, color: "var(--tek-ash)", marginTop: 2 }}>
                        {[product.sku, product.code_barre].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700 }}>
                        {formatPrice(price, locale, currency)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--tek-ash)" }}>
                        {t(locale, "stock")}:{" "}
                        {product.stock_disponible ?? product.stock ?? "—"}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <CartPanel
          locale={locale}
          currency={currency}
          cart={cart}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={removeLine}
          onClear={clearCart}
        />
      </div>
    </div>
  );
}

const panel: CSSProperties = {
  background: "var(--tek-card)",
  border: "1px solid var(--tek-line)",
  borderRadius: 18,
  padding: 18,
  boxShadow: "var(--tek-shadow)",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "var(--tek-ash)",
  marginBottom: 8,
};

const searchInput: CSSProperties = {
  width: "100%",
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 18,
  background: "var(--tek-bg)",
};

const productRow: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  textAlign: "left",
  border: "1px solid var(--tek-line)",
  borderRadius: 12,
  padding: "12px 14px",
  marginBottom: 8,
  cursor: "pointer",
};
