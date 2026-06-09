// "Brand Your Platform" — premium full-screen interstitial shown during onboarding for
// white-label tenants only. Rendered via an additive state-flag + early-return in CompanySetup
// (NOT a wizard step — the step array & numeric indices are untouched). Skippable.
import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { LogoUpload } from "@/components/branding/LogoUpload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const HEX = /^#[0-9a-fA-F]{6}$/;

interface Props {
  onContinue: () => void;
  onSkip: () => void;
}

export function BrandYourPlatformStep({ onContinue, onSkip }: Props) {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const [brandName, setBrandName] = useState(tenantConfig?.brand_name ?? tenantConfig?.company_name ?? "");
  const [primary, setPrimary] = useState(tenantConfig?.primary_color ?? "#6366f1");
  const [saving, setSaving] = useState(false);

  const continueWithSave = async () => {
    if (tenantId) {
      setSaving(true);
      try {
        await supabase
          .from("tenant_config")
          .update({ brand_name: brandName.trim() || null, ...(HEX.test(primary) ? { primary_color: primary } : {}) })
          .eq("tenant_id", tenantId);
        await refreshConfig();
      } catch {
        /* non-blocking — let them proceed regardless */
      } finally {
        setSaving(false);
      }
    }
    onContinue();
  };

  return (
    <div
      className="min-h-[70vh] rounded-2xl flex items-center justify-center p-8"
      style={{
        background: HEX.test(primary)
          ? `radial-gradient(130% 130% at 50% -10%, color-mix(in srgb, ${primary} 55%, hsl(var(--background))) 0%, hsl(var(--background)) 55%)`
          : undefined,
      }}
      data-testid="brand-your-platform"
    >
      <div className="text-center max-w-md w-full">
        <div className="text-[11px] tracking-widest text-muted-foreground mb-4">FINAL TOUCH · ENTERPRISE</div>
        <h1 className="text-3xl font-bold mb-2">Make it yours.</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Add your logo and colours so your team — and your clients — see your brand, not ours.
        </p>

        <div className="mb-5">
          <LogoUpload currentUrl={tenantConfig?.logo_url ?? null} />
        </div>

        <Input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="text-center text-lg font-semibold mb-3"
          placeholder="Your brand name"
        />
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-xs text-muted-foreground">Brand colour</span>
          <input
            type="color"
            value={HEX.test(primary) ? primary : "#6366f1"}
            onChange={(e) => setPrimary(e.target.value)}
            className="h-8 w-10 rounded-md border border-input bg-transparent p-0.5"
          />
          <span className="text-xs font-mono text-muted-foreground">{primary}</span>
        </div>

        <Button className="w-full mb-3" onClick={continueWithSave} disabled={saving} data-testid="brand-continue">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Continue
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground"
          data-testid="brand-skip"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
