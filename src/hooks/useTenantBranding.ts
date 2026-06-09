// useTenantBranding — normalized brand object read from TenantContext.
// Mirrors the existing brandBackgroundColor / features.* precedent in TenantContext.
import { useMemo } from "react";
import { useTenant } from "@/contexts/TenantContext";
import {
  getBrandName,
  getBrandLogo,
  getBrandFavicon,
  getBrandColors,
  isWhiteLabelEnabled,
  brandCssVars,
} from "@/lib/branding";

export function useTenantBranding() {
  const { tenantConfig } = useTenant();
  return useMemo(() => {
    const colors = getBrandColors(tenantConfig);
    return {
      brandName: getBrandName(tenantConfig),
      logoUrl: getBrandLogo(tenantConfig),
      faviconUrl: getBrandFavicon(tenantConfig),
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      isWhiteLabel: isWhiteLabelEnabled(tenantConfig),
      cssVars: brandCssVars(tenantConfig),
      industry: tenantConfig?.industry ?? null,
    };
  }, [tenantConfig]);
}
