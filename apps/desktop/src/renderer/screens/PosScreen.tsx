import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from "react";
import type { AppLocale, Product } from "@teka/shared";
import { CartPanel, type CartLine } from "../components/CartPanel";
import { CartQtyDialog } from "../components/CartQtyDialog";
import { ProductListSkeleton } from "../components/Skeleton";
import { formatPrice, useProducts } from "../hooks/useProducts";
import { useAutoFocus } from "../keyboard/useAutoFocus";
import { t } from "../i18n/messages";

export type PosScreenHandle = {
  focusCart: () => void;
  focusSearch: () => void;
};

/**
 * Flux clavier POS / scanner thermique :
 * 1. Recherche autofocus — filtre local
 * 2. Entrée / flèches → produits ; Entrée → panier
 * 3. F4 → panier ; flèches → ligne ; Entrée → modal quantité
 * 4. Tab → Valider → Vider
 */
export function PosScreen({
  locale,
  currency,
  searchRefExternal,
  handleRef,
}: {
  locale: AppLocale;
  currency?: string | null;
  searchRefExternal?: RefObject<HTMLInputElement | null>;
  handleRef?: Ref<PosScreenHandle | null>;
}) {
  const localRef = useRef<HTMLInputElement>(null);
  const searchRef = searchRefExternal ?? localRef;
  const validateRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cartListRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [listFocused, setListFocused] = useState(false);
  const [cartFocused, setCartFocused] = useState(false);
  const [cartLineId, setCartLineId] = useState<string | null>(null);
  const [qtyEditId, setQtyEditId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  useAutoFocus(searchRef);

  const { products, allProducts, loading, error, reload } = useProducts(query, locale);
  const qtyEditLine = qtyEditId
    ? (cart.find((l) => l.product.id === qtyEditId) ?? null)
    : null;

  useEffect(() => {
    if (products.length === 0) {
      setHighlightId(null);
      return;
    }
    if (!products.some((p) => p.id === highlightId)) {
      setHighlightId(products[0].id);
    }
  }, [products, highlightId]);

  useEffect(() => {
    if (cart.length === 0) {
      setCartLineId(null);
      return;
    }
    if (!cart.some((l) => l.product.id === cartLineId)) {
      setCartLineId(cart[cart.length - 1].product.id);
    }
  }, [cart, cartLineId]);

  useEffect(() => {
    if (!highlightId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-product-id="${CSS.escape(highlightId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightId, listFocused]);

  function focusSearch() {
    setListFocused(false);
    setCartFocused(false);
    setQtyEditId(null);
    searchRef.current?.focus();
  }

  function focusCart() {
    if (cart.length === 0) {
      searchRef.current?.focus();
      return;
    }
    setListFocused(false);
    setQtyEditId(null);
    const id = cartLineId && cart.some((l) => l.product.id === cartLineId)
      ? cartLineId
      : cart[cart.length - 1].product.id;
    setCartLineId(id);
    setCartFocused(true);
    requestAnimationFrame(() => cartListRef.current?.focus());
  }

  useImperativeHandle(handleRef, () => ({ focusCart, focusSearch }), [cart, cartLineId]);

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
    setHighlightId(product.id);
    setCartLineId(product.id);
    setQuery("");
    setListFocused(false);
    setCartFocused(false);
    searchRef.current?.focus();
  }

  function findScanMatch(raw: string, pool: Product[]): Product | null {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    const exact = pool.find(
      (p) =>
        p.code_barre?.trim().toLowerCase() === q ||
        p.sku?.trim().toLowerCase() === q,
    );
    if (exact) return exact;
    if (pool.length === 1) return pool[0];
    return null;
  }

  function focusProductList() {
    if (products.length === 0) return;
    if (!products.some((p) => p.id === highlightId)) {
      setHighlightId(products[0].id);
    }
    setCartFocused(false);
    setListFocused(true);
    listRef.current?.focus();
  }

  function gridColumns(): number {
    const width = listRef.current?.clientWidth ?? 0;
    return Math.max(1, Math.floor((width + 12) / 172));
  }

  function moveHighlight(delta: number) {
    if (products.length === 0) return;
    const idx = products.findIndex((p) => p.id === highlightId);
    const from = idx < 0 ? 0 : idx;
    const next = Math.max(0, Math.min(products.length - 1, from + delta));
    setHighlightId(products[next].id);
  }

  function moveCartLine(delta: number) {
    if (cart.length === 0) return;
    const idx = cart.findIndex((l) => l.product.id === cartLineId);
    const from = idx < 0 ? 0 : idx;
    const next = Math.max(0, Math.min(cart.length - 1, from + delta));
    setCartLineId(cart[next].product.id);
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

  function setLineQty(productId: string, qty: number) {
    if (qty <= 0) {
      removeLine(productId);
      return;
    }
    setCart((prev) =>
      prev.map((line) =>
        line.product.id === productId ? { ...line, qty } : line,
      ),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
    if (qtyEditId === productId) setQtyEditId(null);
  }

  function clearCart() {
    setCart([]);
    setCartLineId(null);
    setQtyEditId(null);
    setCartFocused(false);
    searchRef.current?.focus();
  }

  function validateCart() {
    if (cart.length === 0) return;
    setListFocused(false);
    setCartFocused(false);
    setQtyEditId(null);
    searchRef.current?.focus();
  }

  function openQtyEdit(productId: string) {
    setCartLineId(productId);
    setQtyEditId(productId);
    setCartFocused(false);
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusProductList();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const scanned = findScanMatch(query, allProducts);
      if (scanned && query.trim()) {
        const exact =
          scanned.code_barre?.trim().toLowerCase() === query.trim().toLowerCase() ||
          scanned.sku?.trim().toLowerCase() === query.trim().toLowerCase();
        if (exact || products.length === 1) {
          addToCart(scanned);
          return;
        }
      }
      if (products.length === 1) {
        addToCart(products[0]);
        return;
      }
      focusProductList();
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      focusSearch();
      return;
    }

    if (e.key === "F4") {
      e.preventDefault();
      focusCart();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const target = products.find((p) => p.id === highlightId) ?? products[0];
      if (target) addToCart(target);
      return;
    }

    const cols = gridColumns();
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const idx = products.findIndex((p) => p.id === highlightId);
      if (idx >= 0 && (idx + 1) % cols === 0) {
        focusCart();
        return;
      }
      moveHighlight(1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(cols);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (products.findIndex((p) => p.id === highlightId) < cols) {
        focusSearch();
        return;
      }
      moveHighlight(-cols);
    }
  }

  function onCartKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      focusSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveCartLine(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveCartLine(-1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (cartLineId) openQtyEdit(cartLineId);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (cartLineId) removeLine(cartLineId);
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
            tabIndex={1}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            onFocus={() => {
              setListFocused(false);
              setCartFocused(false);
            }}
            placeholder={t(locale, "posSearchPlaceholder")}
            autoComplete="off"
            style={searchInput}
          />

          {error ? (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <p style={{ margin: 0, color: "var(--tek-danger)", fontSize: 13, flex: "1 1 200px" }}>
                {error}
              </p>
              <button type="button" onClick={() => void reload()} style={retryBtn}>
                {t(locale, "productsRetry")}
              </button>
            </div>
          ) : null}

          <div
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-label={t(locale, "posTitle")}
            aria-activedescendant={highlightId ? `pos-product-${highlightId}` : undefined}
            onKeyDown={onListKeyDown}
            onFocus={() => {
              setListFocused(true);
              setCartFocused(false);
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setListFocused(false);
              }
            }}
            style={{
              marginTop: 14,
              maxHeight: "calc(100vh - 260px)",
              overflow: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              alignContent: "start",
              outline: listFocused ? "2px solid var(--tek-yellow)" : "none",
              outlineOffset: 4,
              borderRadius: 12,
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
                const active = product.id === highlightId;
                const inCart = cart.find((line) => line.product.id === product.id);
                const price = product.prix_vente_ttc ?? product.prix_vente;
                return (
                  <button
                    key={product.id}
                    id={`pos-product-${product.id}`}
                    data-product-id={product.id}
                    type="button"
                    tabIndex={-1}
                    role="option"
                    aria-selected={active}
                    onClick={() => addToCart(product)}
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
                        : active && listFocused
                          ? "inset 0 0 0 2px var(--tek-black)"
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
          ref={validateRef}
          listRef={cartListRef}
          locale={locale}
          currency={currency}
          cart={cart}
          selectedLineId={cartLineId}
          cartFocused={cartFocused}
          onSelectLine={setCartLineId}
          onEditLine={openQtyEdit}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={removeLine}
          onClear={clearCart}
          onValidate={validateCart}
          onCartKeyDown={onCartKeyDown}
          onCartFocus={() => {
            setCartFocused(true);
            setListFocused(false);
          }}
          onCartBlur={() => setCartFocused(false)}
        />
      </div>

      {qtyEditLine ? (
        <CartQtyDialog
          locale={locale}
          currency={currency}
          line={qtyEditLine}
          onConfirm={(qty) => {
            setLineQty(qtyEditLine.product.id, qty);
            setQtyEditId(null);
            focusCart();
          }}
          onRemove={() => {
            const id = qtyEditLine.product.id;
            const remaining = cart.filter((l) => l.product.id !== id);
            removeLine(id);
            setQtyEditId(null);
            if (remaining.length === 0) {
              focusSearch();
              return;
            }
            setCartLineId(remaining[remaining.length - 1].product.id);
            setCartFocused(true);
            requestAnimationFrame(() => cartListRef.current?.focus());
          }}
          onClose={() => {
            setQtyEditId(null);
            focusCart();
          }}
        />
      ) : null}
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

const retryBtn: CSSProperties = {
  border: "1px solid var(--tek-line)",
  borderRadius: 10,
  padding: "8px 14px",
  background: "var(--tek-yellow)",
  color: "var(--tek-black)",
  fontWeight: 650,
  fontSize: 13,
  cursor: "pointer",
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
