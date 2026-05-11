import { useTenant } from "@/contexts/TenantContext";

const SYMBOLS: Record<string, string> = {
  PKR: "Rs.",
  AED: "AED",
  USD: "$",
  GBP: "GBP",
  EUR: "EUR",
  SAR: "SAR",
  QAR: "QAR",
  INR: "Rs",
  BDT: "Tk",
  LKR: "Rs.",
};

export function getCurrencySymbol(currency: string | null | undefined): string {
  if (!currency) return "$";
  return SYMBOLS[currency.toUpperCase()] || currency.toUpperCase();
}

export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
  options: { decimals?: number } = {},
): string {
  const symbol = getCurrencySymbol(currency);
  const decimals = options.decimals ?? 0;
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return symbol + " 0";
  }
  return symbol + " " + amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function useCurrencyFormatter() {
  const { tenantConfig } = useTenant();
  const currency = tenantConfig?.currency || "USD";
  return (amount: number | null | undefined, options: { decimals?: number } = {}) =>
    formatCurrencyAmount(amount, currency, options);
}
