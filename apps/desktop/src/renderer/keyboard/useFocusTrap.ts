import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.hasAttribute("disabled") || el.tabIndex < 0) return false;
    // visible
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}

/**
 * Garde Tab / Shift+Tab à l’intérieur d’un conteneur (modals).
 * Capture au niveau document pour rattraper un focus déjà sorti.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable(root);
      if (items.length === 0) {
        e.preventDefault();
        e.stopPropagation();
        root.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = Boolean(active && root.contains(active));

      if (e.shiftKey) {
        if (!inside || active === first) {
          e.preventDefault();
          e.stopPropagation();
          last.focus();
        }
        return;
      }

      if (!inside || active === last) {
        e.preventDefault();
        e.stopPropagation();
        first.focus();
      }
    };

    if (!root.contains(document.activeElement)) {
      const items = getFocusable(root);
      (items[0] ?? root).focus();
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [containerRef, enabled]);
}
