import type { AuthUser } from "./types.js";

/** Rôles autorisés à annuler une vente depuis la caisse desktop. */
const CANCEL_SALE_ROLES = new Set(["admin", "manager", "gerant", "owner"]);

export function normalizeUserRole(role?: string | null): string {
  const normalized = role?.trim().toLowerCase() ?? "";
  return normalized === "gérant" ? "gerant" : normalized;
}

/** Annulation réservée aux administrateurs (admin / manager / gérant / owner). */
export function canCancelSales(user?: Pick<AuthUser, "type_utilisateur" | "roles"> | null): boolean {
  if (!user) return false;
  const primary = normalizeUserRole(user.type_utilisateur);
  if (CANCEL_SALE_ROLES.has(primary)) return true;
  return (user.roles ?? []).some((role) => CANCEL_SALE_ROLES.has(normalizeUserRole(role)));
}
