import { useEffect, type RefObject } from "react";

/** Focus auto au montage — pattern Odoo POS (champ recherche / premier champ). */
export function useAutoFocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const id = window.requestAnimationFrame(() => {
      ref.current?.focus();
      if (ref.current && "select" in ref.current) {
        (ref.current as unknown as HTMLInputElement).select?.();
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [ref, enabled]);
}
