// useRTL.ts — Determines RTL direction based on tenant's region config
// TENANT-ISOLATED: Only returns isRTL=true for RE tenants in Arabic regions
// Non-RE tenants never import or use this hook

import { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';

interface RTLConfig {
  isRTL: boolean;
  dir: 'rtl' | 'ltr';
  lang: string;
  langSecondary: string | null;
  isArabicRegion: boolean;
  regionCode: string;
}

export function useRTL(): RTLConfig {
  const tenantCtx = useTenant();
  const tenant = (tenantCtx as any).tenant || tenantCtx.tenantConfig;
  const [config, setConfig] = useState<RTLConfig>({
    isRTL: false,
    dir: 'ltr',
    lang: 'en',
    langSecondary: null,
    isArabicRegion: false,
    regionCode: 'generic'
  });

  useEffect(() => {
    if (!tenant || tenant.industry !== 'real_estate') {
      // Non-RE tenants: always LTR, exit immediately
      return;
    }

    async function loadRegionConfig() {
      try {
        // Map tenant country to region code
        const countryToRegion: Record<string, string> = {
          'UAE': 'uae', 'AE': 'uae',
          'Saudi Arabia': 'saudi', 'SA': 'saudi', 'KSA': 'saudi',
          'Qatar': 'qatar', 'QA': 'qatar',
          'Pakistan': 'pakistan', 'PK': 'pakistan',
          'UK': 'uk', 'GB': 'uk',
          'USA': 'usa', 'US': 'usa',
          'Canada': 'canada', 'CA': 'canada'
        };

        const regionCode = countryToRegion[tenant.country || ''] || 'generic';

        const { data, error } = await supabase
          .from('re_region_config' as any)
          .select('rtl_support, language_primary, language_secondary')
          .eq('region_code', regionCode)
          .single();

        if (data && !error) {
          const typedData = data as any;
          const isRTL = typedData.rtl_support === true;
          setConfig({
            isRTL,
            dir: isRTL ? 'rtl' : 'ltr',
            lang: typedData.language_primary || 'en',
            langSecondary: typedData.language_secondary || null,
            isArabicRegion: isRTL,
            regionCode
          });
        }
      } catch (err) {
        // Silently fall back to LTR on any error
        console.warn('useRTL: Failed to load region config, defaulting to LTR');
      }
    }

    loadRegionConfig();
  }, [tenant]);

  return config;
}
