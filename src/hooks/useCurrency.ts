import { useTenant } from "@/contexts/TenantContext";

const CURRENCY_SYMBOLS: Record<string, string> = {
  AED: "AED",
  PKR: "\u20A8",
  USD: "$",
  GBP: "\u00A3",
  EUR: "\u20AC",
  INR: "\u20B9",
  SAR: "SAR",
  QAR: "QAR",
  CAD: "C$",
  AUD: "A$",
};

export function useCurrency() {
  const { tenantConfig } = useTenant();

  const currency = tenantConfig?.currency || "AED";
  const country = tenantConfig?.country || "AE";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const formatPrice = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return `${symbol} 0`;
    if (amount === 0) return `${symbol} 0`;

    if (currency === "PKR" || currency === "INR") {
      if (Math.abs(amount) >= 10000000) return `${symbol} ${(amount / 10000000).toFixed(2)} Cr`;
      if (Math.abs(amount) >= 100000) return `${symbol} ${(amount / 100000).toFixed(2)} Lac`;
      return `${symbol} ${Math.round(amount).toLocaleString("en-IN")}`;
    }

    if (Math.abs(amount) >= 1000000) return `${symbol} ${(amount / 1000000).toFixed(2)}M`;
    if (Math.abs(amount) >= 1000) return `${symbol} ${(amount / 1000).toFixed(0)}K`;
    return `${symbol} ${Math.round(amount).toLocaleString()}`;
  };

  const formatPricePerUnit = (pricePerUnit: number | null | undefined, unit: string = "sqft"): string => {
    if (!pricePerUnit || isNaN(pricePerUnit)) return `${symbol} 0/${unit}`;
    return `${symbol} ${Math.round(pricePerUnit).toLocaleString()}/${unit}`;
  };

  return { currency, symbol, country, formatPrice, formatPricePerUnit };
}
