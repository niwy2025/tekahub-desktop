import type { Product } from "@teka/shared";

function truthyFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function isServiceProduct(product: Product): boolean {
  return product.type === "service" || product.stock_source === "service";
}

/**
 * Stock max vendable pour un produit.
 * `null` = illimité (service / stock_illimite).
 */
export function availableStock(product: Product): number | null {
  if (
    isServiceProduct(product) ||
    truthyFlag(product.stock_illimite) ||
    product.stock_source === "illimite"
  ) {
    return null;
  }
  const raw = product.stock_disponible ?? product.stock;
  const n = typeof raw === "string" ? Number(raw) : Number(raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function formatStockLabel(product: Product): string {
  const max = availableStock(product);
  return max === null ? "∞" : String(max);
}

/** Peut-on monter la quantité panier jusqu’à `nextQty` ? */
export function canSetQty(product: Product, nextQty: number): boolean {
  if (nextQty <= 0) return false;
  const max = availableStock(product);
  if (max === null) return true;
  return nextQty <= max;
}

export function clampQty(product: Product, qty: number): number {
  const safe = Math.max(0, Math.floor(qty));
  const max = availableStock(product);
  if (max === null) return Math.max(1, safe);
  return Math.min(max, Math.max(0, safe));
}
