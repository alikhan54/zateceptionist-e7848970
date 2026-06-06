// White-label branding helpers (Phase 1A).
// Pure functions over a TenantConfig. Reuses existing tenant_config columns
// (primary_color, secondary_color, logo_url) + the 5 net-new (brand_name,
// brand_favicon_url, white_label_tenant_cap, parent_agency_tenant_id, custom_domain).
import type { CSSProperties } from "react";
import type { TenantConfig } from "@/contexts/TenantContext";

const HEX = /^#[0-9a-fA-F]{6}$/;

export interface BrandColors {
  primary: string | null;
  secondary: string | null;
}

/** Gate: branding UI/onboarding step show ONLY when features.white_label === true. */
export function isWhiteLabelEnabled(tc: TenantConfig | null | undefined): boolean {
  const f = tc?.features as Record<string, unknown> | null | undefined;
  return f?.white_label === true;
}

/** Display name: brand_name overrides company_name; final fallback "Zateceptionist". */
export function getBrandName(tc: TenantConfig | null | undefined): string {
  const brand = (tc?.brand_name ?? "").trim();
  if (brand) return brand;
  const company = (tc?.company_name ?? "").trim();
  return company || "Zateceptionist";
}

export function getBrandLogo(tc: TenantConfig | null | undefined): string | null {
  return tc?.logo_url || null;
}

export function getBrandFavicon(tc: TenantConfig | null | undefined): string | null {
  return tc?.brand_favicon_url || null;
}

export function getBrandColors(tc: TenantConfig | null | undefined): BrandColors {
  return { primary: tc?.primary_color || null, secondary: tc?.secondary_color || null };
}

/** CSS custom props for global re-skin. Only emits validated #rrggbb values. */
export function brandCssVars(tc: TenantConfig | null | undefined): CSSProperties {
  const vars: Record<string, string> = {};
  const { primary, secondary } = getBrandColors(tc);
  if (primary && HEX.test(primary)) vars["--brand-primary"] = primary;
  if (secondary && HEX.test(secondary)) vars["--brand-secondary"] = secondary;
  return vars as CSSProperties;
}
