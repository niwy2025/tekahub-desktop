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
    if (
      (e.key === "ArrowDown" || e.key === "ArrowRight") &&
      products.length > 0
    ) {
      e.preventDefault();
      const idx = Math.max(0, products.findIndex((p) => p.id === selectedId));
      const step = e.key === "ArrowDown" ? estimateGridColumns() : 1;
      const next = products[Math.min(products.length - 1, idx + step)];
      setSelectedId(next.id);
      return;
    }
    if (
      (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
      products.length > 0
    ) {
      e.preventDefault();
      const idx = Math.max(0, products.findIndex((p) => p.id === selectedId));
      const step = e.key === "ArrowUp" ? estimateGridColumns() : 1;
      const next = products[Math.max(0, idx - step)];
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
            style={{
              marginTop: 14,
              maxHeight: "calc(100vh - 260px)",
              overflow: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              alignContent: "start",
            }}
          >
            {loading ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <ProductListSkeleton rows={12} />
              </div>
            ) : products.length === 0 ? (
              <p style={{ gridColumn: "1 / -1", color: "var(--tek-ash)", fontSize: 14 }}>
                {t(locale, "productsEmpty")}
              </p>
            ) : (
              products.map((product) => {
                const active = product.id === selectedId;
                const inCart = cart.find((line) => line.product.id === product.id);
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
                      ...productCard,
                      borderColor: inCart
                        ? "var(--tek-yellow)"
                        : active
                          ? "var(--tek-black)"
                          : "var(--tek-line)",
                      background: inCart
                        ? "rgba(244, 198, 15, 0.28)"
                        : active
                          ? "rgba(244, 198, 15, 0.12)"
                          : "var(--tek-bg)",
                      boxShadow: inCart
                        ? "inset 0 0 0 2px var(--tek-yellow)"
                        : undefined,
                    }}
                  >
                    {inCart ? (
                      <span style={cartBadge}>×{inCart.qty}</span>
                    ) : null}
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
                      {[product.sku, product.code_barre].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div style={{ marginTop: "auto", paddingTop: 10 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {formatPrice(price, locale, currency)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--tek-ash)", marginTop: 2 }}>
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

/** Approx. columns for keyboard nav in auto-fill grid (minmax 160px). */
function estimateGridColumns(): number {
  const width = typeof window !== "undefined" ? window.innerWidth : 1200;
  const usable = Math.max(320, width - 520);
  return Math.max(1, Math.floor(usable / 172));
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

const productCard: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  textAlign: "left",
  border: "1px solid var(--tek-line)",
  borderRadius: 14,
  padding: 14,
  minHeight: 128,
  cursor: "pointer",
};

const cartBadge: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  minWidth: 24,
  height: 24,
  padding: "0 6px",
  borderRadius: 999,
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontSize: 12,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
