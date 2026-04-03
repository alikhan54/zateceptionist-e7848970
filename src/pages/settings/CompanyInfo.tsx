import { useState, useEffect } from "react";
import { useTenant, IndustryType } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, Brain, Save, Loader2, Clock, Globe, Link } from "lucide-react";

const INDUSTRIES: { value: IndustryType; label: string }[] = [
  { value: "technology", label: "Technology" },
  { value: "restaurant", label: "Restaurant" },
  { value: "healthcare", label: "Healthcare" },
  { value: "healthcare_clinic", label: "Healthcare Clinic" },
  { value: "healthcare_staffing", label: "Healthcare Staffing" },
  { value: "real_estate", label: "Real Estate" },
  { value: "construction_estimation", label: "Construction" },
  { value: "banking_collections", label: "Banking & Collections" },
  { value: "salon", label: "Salon & Spa" },
  { value: "legal", label: "Legal" },
  { value: "fitness", label: "Fitness" },
  { value: "education", label: "Education" },
  { value: "automotive", label: "Automotive" },
  { value: "professional", label: "Professional Services" },
  { value: "retail", label: "Retail" },
  { value: "general", label: "General" },
];

export default function CompanyInfo() {
  const { tenantId, tenantConfig, refreshConfig } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    industry: "general" as IndustryType,
    services_description: "",
    target_audience: "",
    value_proposition: "",
    timezone: "",
    opening_time: "",
    closing_time: "",
    currency: "",
    ai_name: "",
    ai_role: "",
    logo_url: "",
    primary_color: "",
    website_url: "",
    instagram_url: "",
    facebook_url: "",
    linkedin_url: "",
  });

  // Load social links from business_profiles (separate from tenant_config)
  useEffect(() => {
    if (tenantConfig) {
      setFormData((prev) => ({
        ...prev,
        company_name: tenantConfig.company_name || "",
        industry: tenantConfig.industry || "general",
        services_description: tenantConfig.services_description || "",
        target_audience: tenantConfig.target_audience || "",
        value_proposition: tenantConfig.value_proposition || "",
        timezone: tenantConfig.timezone || "",
        opening_time: tenantConfig.opening_time || "",
        closing_time: tenantConfig.closing_time || "",
        currency: tenantConfig.currency || "",
        ai_name: tenantConfig.ai_name || "",
        ai_role: tenantConfig.ai_role || "",
        logo_url: tenantConfig.logo_url || "",
        primary_color: tenantConfig.primary_color || "",
      }));
    }
  }, [tenantConfig]);

  // Load business_profiles data (social links, website)
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("business_profiles")
      .select("website_url, instagram_url, facebook_url, linkedin_url")
      .eq("tenant_id", tenantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFormData((prev) => ({
            ...prev,
            website_url: data.website_url || "",
            instagram_url: data.instagram_url || "",
            facebook_url: data.facebook_url || "",
            linkedin_url: data.linkedin_url || "",
          }));
        }
      });
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_config")
        .update({
          company_name: formData.company_name || null,
          industry: formData.industry,
          services_description: formData.services_description || null,
          target_audience: formData.target_audience || null,
          value_proposition: formData.value_proposition || null,
          timezone: formData.timezone || null,
          opening_time: formData.opening_time || null,
          closing_time: formData.closing_time || null,
          currency: formData.currency || null,
          ai_name: formData.ai_name || null,
          ai_role: formData.ai_role || null,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color || null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Sync to business_profiles (non-blocking secondary save)
      try {
        await supabase
          .from("business_profiles")
          .upsert(
            {
              tenant_id: tenantId,
              company_name: formData.company_name || null,
              industry: formData.industry || null,
              short_description: formData.services_description || null,
              unique_value_proposition: formData.value_proposition || null,
              website_url: formData.website_url || null,
              instagram_url: formData.instagram_url || null,
              facebook_url: formData.facebook_url || null,
              linkedin_url: formData.linkedin_url || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" }
          );
      } catch (bpErr) {
        console.warn("business_profiles sync failed:", bpErr);
      }

      toast({ title: "Saved", description: "Company information updated successfully" });
      await refreshConfig();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Business Profile</p>
        <h1 className="text-2xl font-bold">Company Information</h1>
        <p className="text-muted-foreground">
          Manage your business details and AI assistant configuration
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Details
            </CardTitle>
            <CardDescription>Your company's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => updateField("industry", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="services_description">Services Description</Label>
              <Textarea
                id="services_description"
                value={formData.services_description}
                onChange={(e) => updateField("services_description", e.target.value)}
                placeholder="Describe the services your business offers..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Textarea
                id="target_audience"
                value={formData.target_audience}
                onChange={(e) => updateField("target_audience", e.target.value)}
                placeholder="Who are your ideal customers?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value_proposition">Value Proposition</Label>
              <Textarea
                id="value_proposition"
                value={formData.value_proposition}
                onChange={(e) => updateField("value_proposition", e.target.value)}
                placeholder="What makes your business unique?"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operations
              </CardTitle>
              <CardDescription>Business hours and locale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  placeholder="Asia/Dubai"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input
                    id="opening_time"
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => updateField("opening_time", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input
                    id="closing_time"
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => updateField("closing_time", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  placeholder="USD"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Assistant
              </CardTitle>
              <CardDescription>Customize your AI assistant identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai_name">AI Name</Label>
                <Input
                  id="ai_name"
                  value={formData.ai_name}
                  onChange={(e) => updateField("ai_name", e.target.value)}
                  placeholder="e.g., Cosmique AI, Sarah"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_role">AI Role</Label>
                <Input
                  id="ai_role"
                  value={formData.ai_role}
                  onChange={(e) => updateField("ai_role", e.target.value)}
                  placeholder="e.g., Sales Assistant, Support Agent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary_color">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) => updateField("primary_color", e.target.value)}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                  {formData.primary_color && (
                    <div
                      className="h-10 w-10 rounded border"
                      style={{ backgroundColor: formData.primary_color }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Website & Social Links
          </CardTitle>
          <CardDescription>Your online presence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => updateField("website_url", e.target.value)}
                  placeholder="https://example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram</Label>
              <div className="relative">
                <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => updateField("instagram_url", e.target.value)}
                  placeholder="https://instagram.com/yourpage"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook_url">Facebook</Label>
              <div className="relative">
                <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="facebook_url"
                  value={formData.facebook_url}
                  onChange={(e) => updateField("facebook_url", e.target.value)}
                  placeholder="https://facebook.com/yourpage"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <div className="relative">
                <Link className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => updateField("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/company/yourco"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
