import { useEffect } from "react";
import {
  SHORTCUTS,
  type ShortcutAction,
  isTypingTarget,
} from "./shortcuts";

type Handlers = Partial<Record<ShortcutAction, () => void>>;

/**
 * Écoute les raccourcis globaux. Enter/Esc restent gérés au niveau formulaire / dialog.
 */
export function useGlobalShortcuts(handlers: Handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of SHORTCUTS) {
        if (!shortcut.match(e)) continue;
        const handler = handlers[shortcut.action];
        if (!handler) continue;

        // Ne pas voler la frappe dans un champ sauf raccourcis à modificateur / F2
        if (
          isTypingTarget(e) &&
          shortcut.action === "focus.search"
        ) {
          continue;
        }

        e.preventDefault();
        e.stopPropagation();
        handler();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers, enabled]);
}
