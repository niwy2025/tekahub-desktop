import type { EnterpriseExchangeRate } from "@teka/shared";

/** Devises « fortes » affichées à gauche du taux (ex. 1 USD = N CDF). */
const HARD_CURRENCIES = new Set(["USD", "EUR"]);

function normalize(code: string | null | undefined) {
  return (code || "").trim().toUpperCase();
}

export function usesInverseExchangeInput(
  mainCurrency: string,
  foreignCurrency: string,
): boolean {
  const main = normalize(mainCurrency);
  const foreign = normalize(foreignCurrency);
  if (!main || !foreign || main === foreign) return false;
  if (HARD_CURRENCIES.has(foreign)) return false;
  return HARD_CURRENCIES.has(main);
}

export function formatExchangeRateHint(
  mainCurrency: string,
  foreignCurrency: string,
  backendTaux: number,
): string {
  const main = normalize(mainCurrency) || "XXX";
  const foreign = normalize(foreignCurrency) || "XXX";
  const display = backendRateToDisplay(main, foreign, backendTaux);
  if (display == null) return `${foreign} / ${main}`;
  if (usesInverseExchangeInput(main, foreign)) {
    return `1 ${main} = ${display} ${foreign}`;
  }
  return `1 ${foreign} = ${display} ${main}`;
}

export function backendRateToDisplay(
  mainCurrency: string,
  foreignCurrency: string,
  backendTaux: number | string | null | undefined,
): number | null {
  const rate = Number(backendTaux);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (usesInverseExchangeInput(mainCurrency, foreignCurrency)) {
    return roundRate(1 / rate);
  }
  return roundRate(rate);
}

function roundRate(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function toMainAmount(
  amount: number,
  devise: string,
  mainCurrency: string,
  rates: EnterpriseExchangeRate[],
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const code = normalize(devise);
  const main = normalize(mainCurrency);
  if (code === main) return roundMoney(amount);
  const rate = rates.find((item) => normalize(item.devise) === code);
  if (!rate || Number(rate.taux) <= 0) return 0;
  return roundMoney(amount * Number(rate.taux));
}
