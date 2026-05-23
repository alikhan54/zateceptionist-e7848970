import { useTenant } from "@/contexts/TenantContext";
import { ClinicPulseTab } from "./ClinicPulseTab";
import { RestaurantPulseTab } from "./RestaurantPulseTab";
import { RealEstatePulseTab } from "./RealEstatePulseTab";
import { BankingCollectionsPulseTab } from "./BankingCollectionsPulseTab";
import { TechPulseTab } from "./TechPulseTab";

/**
 * Phase 11 + 12.D — pluggable industry-specific Pulse tab.
 *
 * Dispatches to a per-industry widget block based on tenant_config.industry.
 * Returns null for industries without a tab yet — adding new verticals
 * is a single import + branch here.
 */
export function IndustryTab() {
  const { tenantConfig } = useTenant();
  const industry = (tenantConfig as any)?.industry as string | undefined;

  if (industry === "healthcare_clinic") return <ClinicPulseTab />;
  if (industry === "restaurant") return <RestaurantPulseTab />;
  if (industry === "real_estate") return <RealEstatePulseTab />;
  if (industry === "banking_collections") return <BankingCollectionsPulseTab />;
  if (industry === "technology") return <TechPulseTab />;
  // future: construction, forex_trading, youtube_agency

  return null;
}
