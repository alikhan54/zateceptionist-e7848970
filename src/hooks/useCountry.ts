import { useTenant } from "@/contexts/TenantContext";

const COUNTRY_UNIT_MAP: Record<string, string> = {
  AE: "sqft", SA: "sqft", QA: "sqft", US: "sqft", GB: "sqft", CA: "sqft",
  PK: "sq yd", IN: "sq yd",
};

const COUNTRY_FLAG_MAP: Record<string, string> = {
  AE: "\uD83C\uDDE6\uD83C\uDDEA", PK: "\uD83C\uDDF5\uD83C\uDDF0", SA: "\uD83C\uDDF8\uD83C\uDDE6",
  QA: "\uD83C\uDDF6\uD83C\uDDE6", US: "\uD83C\uDDFA\uD83C\uDDF8", GB: "\uD83C\uDDEC\uD83C\uDDE7",
  IN: "\uD83C\uDDEE\uD83C\uDDF3", CA: "\uD83C\uDDE8\uD83C\uDDE6", AU: "\uD83C\uDDE6\uD83C\uDDFA",
  DE: "\uD83C\uDDE9\uD83C\uDDEA", FR: "\uD83C\uDDEB\uD83C\uDDF7", EG: "\uD83C\uDDEA\uD83C\uDDEC",
  JO: "\uD83C\uDDEF\uD83C\uDDF4",
};

export function useCountry() {
  const { tenantConfig } = useTenant();

  const country = tenantConfig?.country || "AE";
  const city = (tenantConfig as any)?.city || "Dubai";
  const timezone = tenantConfig?.timezone || "Asia/Dubai";
  const unit = COUNTRY_UNIT_MAP[country] || "sqft";
  const flag = COUNTRY_FLAG_MAP[country] || "";

  const isPakistan = country === "PK";
  const isUAE = country === "AE";
  const isGulf = ["AE", "SA", "QA", "KW", "BH", "OM"].includes(country);

  return { country, city, timezone, unit, flag, isPakistan, isUAE, isGulf };
}
