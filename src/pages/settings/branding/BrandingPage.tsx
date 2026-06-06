// Settings → Branding (Phase 1A). Gated on features.white_label === true.
// Non-white-label tenants see an upgrade CTA; white-label tenants get the full editor.
import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import { supabase } from "@/integrations/supabase/client";
import { LogoUpload } from "@/components/branding/LogoUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Lock, Loader2 } from "lucide-react";

const HEX = /^#[0-9a-fA-F]{6}$/;

export default function BrandingPage() {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const { isWhiteLabel, brandName: resolvedName, logoUrl } = useTenantBranding();
  const { toast } = useToast();

  const [brandName, setBrandName] = useState(tenantConfig?.brand_name ?? "");
  const [primary, setPrimary] = useState(tenantConfig?.primary_color ?? "#6366f1");
  const [secondary, setSecondary] = useState(tenantConfig?.secondary_color ?? "#8b5cf6");
  const [saving, setSaving] = useState(false);

  if (!isWhiteLabel) {
    return (
      <div className="max-w-2xl mx-auto py-10" data-testid="branding-upgrade-cta">
        <Card>
          <CardContent className="p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold mb-2">White-label branding is an enterprise feature</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add your own logo, colours and name across the platform — for your team and your clients.
              Available on enterprise / white-label plans.
            </p>
            <Button>Contact sales</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const save = async () => {
    if (!tenantId) return;
    if (!HEX.test(primary) || !HEX.test(secondary)) {
      toast({ title: "Invalid colour", description: "Use #rrggbb hex values.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("tenant_config")
      .update({ brand_name: brandName.trim() || null, primary_color: primary, secondary_color: secondary })
      .eq("tenant_id", tenantId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    await refreshConfig();
    toast({ title: "Branding saved" });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6" data-testid="branding-page">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Branding</h1>
          <p className="text-sm text-muted-foreground">Make the platform yours — logo, colours, and name.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
          <CardDescription>Shown in the sidebar, header, and on the login screen.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUpload currentUrl={logoUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Name &amp; colours</CardTitle>
          <CardDescription>Brand name overrides the company name in the UI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="brandName">Brand name</Label>
            <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder={tenantConfig?.company_name ?? "Your brand"} />
            <p className="text-xs text-muted-foreground">Falls back to “{resolvedName}” when empty.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="primary">Primary colour</Label>
              <div className="flex items-center gap-2">
                <input id="primary" type="color" value={HEX.test(primary) ? primary : "#6366f1"} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-12 rounded-md border border-input bg-transparent p-0.5" />
                <Input value={primary} onChange={(e) => setPrimary(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secondary">Secondary colour</Label>
              <div className="flex items-center gap-2">
                <input id="secondary" type="color" value={HEX.test(secondary) ? secondary : "#8b5cf6"} onChange={(e) => setSecondary(e.target.value)} className="h-9 w-12 rounded-md border border-input bg-transparent p-0.5" />
                <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} className="font-mono" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} data-testid="branding-save">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save branding
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
