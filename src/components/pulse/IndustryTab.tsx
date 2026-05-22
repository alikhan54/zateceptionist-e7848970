import { useTenant } from "@/contexts/TenantContext";
import { ClinicPulseTab } from "./ClinicPulseTab";

/**
 * Phase 11 — pluggable industry-specific Pulse tab.
 *
 * Dispatches to a per-industry widget block based on tenant_config.industry.
 * Returns null for industries without a tab yet — adding new verticals
 * (Restaurant, Real Estate, etc.) is a single import + branch here.
 *
 * Render contract: this is ADDITIVE. The host page (e.g. ClinicDashboard
 * or legacy Dashboard) places <IndustryTab /> as a new section without
 * removing or refactoring any existing widget.
 */
export function IndustryTab() {
  const { tenantConfig } = useTenant();
  const industry = (tenantConfig as any)?.industry as string | undefined;

  if (industry === "healthcare_clinic") return <ClinicPulseTab />;
  // future:
  //   if (industry === "restaurant") return <RestaurantPulseTab />;
  //   if (industry === "real_estate") return <RealEstatePulseTab />;
  //   if (industry === "banking_collections") return <CollectionsPulseTab />;
  //   if (industry === "construction") return <ConstructionPulseTab />;
  //   if (industry === "forex_trading") return <ForexPulseTab />;

  return null;
}
