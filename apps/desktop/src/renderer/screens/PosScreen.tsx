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

/**
 * Flux clavier POS / scanner thermique :
 * 1. Recherche autofocus — catalogue déjà chargé, filtre local
 * 2. Entrée → si code-barres/SKU exact : ajoute ; sinon focus liste produits
 * 3. Flèches sur la liste → produit cible ; Entrée → panier
 * 4. Tab → Valider → Vider (grille hors tabulation)
 */
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
  const validateRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [listFocused, setListFocused] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  useAutoFocus(searchRef);

  const { products, allProducts, loading, error, reload } = useProducts(query, locale);

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
    if (!highlightId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-product-id="${CSS.escape(highlightId)}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightId, listFocused]);

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
    setQuery("");
    setListFocused(false);
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
    setListFocused(true);
    listRef.current?.focus();
  }

  function gridColumns(): number {
    const width = listRef.current?.clientWidth ?? 0;
    // aligné sur minmax(160px, 1fr) + gap 12
    return Math.max(1, Math.floor((width + 12) / 172));
  }

  function moveHighlight(delta: number) {
    if (products.length === 0) return;
    const idx = products.findIndex((p) => p.id === highlightId);
    const from = idx < 0 ? 0 : idx;
    const next = Math.max(0, Math.min(products.length - 1, from + delta));
    setHighlightId(products[next].id);
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
    setListFocused(false);
    searchRef.current?.focus();
  }

  function validateCart() {
    if (cart.length === 0) return;
    // Paiement / ticket : prochaine étape.
    setListFocused(false);
    searchRef.current?.focus();
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
      // Scanner : match exact sur tout le catalogue préchargé (pas seulement le filtre).
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
      setListFocused(false);
      searchRef.current?.focus();
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
        setListFocused(false);
        searchRef.current?.focus();
        return;
      }
      moveHighlight(-cols);
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
            onFocus={() => setListFocused(false)}
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
            onFocus={() => setListFocused(true)}
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
          locale={locale}
          currency={currency}
          cart={cart}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={removeLine}
          onClear={clearCart}
          onValidate={validateCart}
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
