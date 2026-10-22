import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PrinterSettings } from "@teka/shared";
import { getAppPaths } from "./paths";

const FILE = "printer.json";

const DEFAULTS: PrinterSettings = {
  autoPrintAfterSale: true,
  silentPrint: true,
  printerName: null,
};

function settingsPath() {
  const dir = getAppPaths().config;
  mkdirSync(dir, { recursive: true });
  return join(dir, FILE);
}

export function getPrinterSettings(): PrinterSettings {
  const file = settingsPath();
  if (!existsSync(file)) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<PrinterSettings>;
    return {
      autoPrintAfterSale:
        typeof parsed.autoPrintAfterSale === "boolean"
          ? parsed.autoPrintAfterSale
          : DEFAULTS.autoPrintAfterSale,
      silentPrint:
        typeof parsed.silentPrint === "boolean" ? parsed.silentPrint : DEFAULTS.silentPrint,
      printerName:
        typeof parsed.printerName === "string" && parsed.printerName.trim()
          ? parsed.printerName.trim()
          : null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setPrinterSettings(patch: Partial<PrinterSettings>): PrinterSettings {
  const current = getPrinterSettings();
  const next: PrinterSettings = {
    autoPrintAfterSale:
      typeof patch.autoPrintAfterSale === "boolean"
        ? patch.autoPrintAfterSale
        : current.autoPrintAfterSale,
    silentPrint:
      typeof patch.silentPrint === "boolean" ? patch.silentPrint : current.silentPrint,
    printerName:
      patch.printerName === null
        ? null
        : typeof patch.printerName === "string"
          ? patch.printerName.trim() || null
          : current.printerName,
  };
  writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}
