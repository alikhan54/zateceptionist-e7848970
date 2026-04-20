import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Phone,
  Plus,
  Globe,
  PhoneIncoming,
  PhoneOutgoing,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCcw,
  Trash2,
  Star,
  Loader2,
  Shield,
  Zap,
  Wand2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface PhoneNumber {
  id: string;
  tenant_id: string;
  phone_number: string;
  country_code: string;
  country_name: string | null;
  provider: string;
  provider_id: string | null;
  number_type: string;
  capability: string[];
  direction: string;
  assigned_to: string;
  is_active: boolean;
  is_primary_inbound: boolean;
  is_primary_outbound: boolean;
  monthly_cost: number;
  vapi_assistant_id: string | null;
  forwarding_number: string | null;
  label: string | null;
  can_call_countries: string[] | null;
  notes: string | null;
  purchased_at: string | null;
  created_at: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}", CA: "\u{1F1E8}\u{1F1E6}", GB: "\u{1F1EC}\u{1F1E7}",
  AE: "\u{1F1E6}\u{1F1EA}", IN: "\u{1F1EE}\u{1F1F3}", AU: "\u{1F1E6}\u{1F1FA}",
  DE: "\u{1F1E9}\u{1F1EA}", FR: "\u{1F1EB}\u{1F1F7}", SA: "\u{1F1F8}\u{1F1E6}",
  PK: "\u{1F1F5}\u{1F1F0}", ES: "\u{1F1EA}\u{1F1F8}", IT: "\u{1F1EE}\u{1F1F9}",
  BR: "\u{1F1E7}\u{1F1F7}", MX: "\u{1F1F2}\u{1F1FD}", JP: "\u{1F1EF}\u{1F1F5}",
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom",
  AE: "UAE", IN: "India", AU: "Australia",
  DE: "Germany", FR: "France", SA: "Saudi Arabia", PK: "Pakistan",
  ES: "Spain", IT: "Italy", BR: "Brazil", MX: "Mexico", JP: "Japan",
};

const PROVIDER_BADGES: Record<string, { label: string; className: string }> = {
  vapi: { label: "VAPI", className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  twilio: { label: "Twilio", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  custom: { label: "Custom", className: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300" },
};

// ── SmartSetupWizard ── 3-step guided setup for new tenants ──
function SmartSetupWizard({
  onComplete,
  onSyncVAPI,
  isSyncing,
  tenantId,
}: {
  onComplete: () => void;
  onSyncVAPI: () => void;
  isSyncing: boolean;
  tenantId: string | null;
}) {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<"vapi" | "twilio" | null>(null);
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioSaved, setTwilioSaved] = useState(false);
  const { toast } = useToast();

  const handleSaveTwilioCredentials = async () => {
    if (!tenantId || !twilioSid || !twilioToken) return;
    setSavingTwilio(true);
    try {
      const { error } = await supabase
        .from("tenant_config")
        .update({
          byo_twilio_sid: twilioSid,
          byo_twilio_token: twilioToken,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      setTwilioSaved(true);
      toast({ title: "Twilio connected", description: "Your Twilio credentials have been saved." });
    } catch (err: any) {
      toast({ title: "Error saving credentials", description: err.message, variant: "destructive" });
    } finally {
      setSavingTwilio(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Wand2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Phone Number Setup</CardTitle>
        <CardDescription>Get your AI voice calls running in 3 simple steps</CardDescription>
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${s < step ? "bg-green-500" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-8 mt-1">
          <span className={`text-xs ${step === 1 ? "text-primary font-medium" : "text-muted-foreground"}`}>Provider</span>
          <span className={`text-xs ${step === 2 ? "text-primary font-medium" : "text-muted-foreground"}`}>Connect</span>
          <span className={`text-xs ${step === 3 ? "text-primary font-medium" : "text-muted-foreground"}`}>Done</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Step 1: Choose Provider */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">Choose how you want to connect phone numbers</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setSelectedProvider("vapi")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedProvider === "vapi"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
                    : "border-muted hover:border-purple-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="font-semibold">VAPI</span>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">Managed Voice AI &mdash; auto-sync your existing VAPI numbers</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> Full AI agent on every call</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> US, UK, CA coverage</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> One-click sync</li>
                </ul>
              </div>
              <div
                onClick={() => setSelectedProvider("twilio")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedProvider === "twilio"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                    : "border-muted hover:border-red-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="font-semibold">Twilio</span>
                  <Badge className="bg-red-100 text-red-700 text-xs">International</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">Bring your own numbers &mdash; imported into VAPI for AI calls</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> 100+ countries</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> UAE, Pakistan, GCC</li>
                  <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-green-500" /> Import into VAPI AI</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { if (selectedProvider) setStep(2); }} disabled={!selectedProvider}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Connect — VAPI */}
        {step === 2 && selectedProvider === "vapi" && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 rounded-full px-4 py-2 mb-3">
                <Zap className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">VAPI Provider</span>
              </div>
              <p className="text-sm text-muted-foreground">Click below to sync your existing VAPI phone numbers automatically.</p>
            </div>
            <div className="flex justify-center py-4">
              <Button
                size="lg"
                onClick={() => { onSyncVAPI(); setTimeout(() => setStep(3), 4000); }}
                disabled={isSyncing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSyncing ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Syncing from VAPI...</>
                ) : (
                  <><RefreshCcw className="h-5 w-5 mr-2" /> Sync Phone Numbers from VAPI</>
                )}
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button variant="outline" onClick={() => setStep(3)}>
                Skip & Add Manually <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Connect — Twilio */}
        {step === 2 && selectedProvider === "twilio" && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-950/30 rounded-full px-4 py-2 mb-3">
                <Globe className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Twilio Provider</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter your Twilio credentials. Numbers will be imported into VAPI for AI-powered calls.
              </p>
            </div>
            {!twilioSaved ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="space-y-2">
                  <Label>Twilio Account SID</Label>
                  <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Twilio Auth Token</Label>
                  <Input type="password" placeholder="Your Twilio auth token" value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)} />
                </div>
                <Button onClick={handleSaveTwilioCredentials} className="w-full bg-red-600 hover:bg-red-700"
                  disabled={!twilioSid || !twilioToken || savingTwilio}>
                  {savingTwilio ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Shield className="h-4 w-4 mr-2" /> Save & Connect</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950/30 rounded-full px-4 py-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Twilio connected</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  You can now add Twilio phone numbers using the Add Number form.
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!twilioSaved}>
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {selectedProvider === "vapi" ? "VAPI Sync Complete!" : "Twilio Connected!"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProvider === "vapi"
                  ? "Your VAPI numbers have been synced. Use Add Number to register additional numbers."
                  : "Your Twilio credentials are saved. Use Add Number to register your Twilio phone numbers."}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button onClick={onComplete} size="lg">
                <Plus className="h-4 w-4 mr-2" /> Add Phone Numbers
              </Button>
              <Button variant="ghost" size="sm" onClick={onComplete}>
                I'll do this later
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VoicePhoneNumbers() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newNumber, setNewNumber] = useState({
    phone_number: "",
    country_code: "US",
    provider: "vapi",
    provider_id: "",
    number_type: "local",
    direction: "both",
    assigned_to: "sales",
    vapi_assistant_id: "",
    notes: "",
    label: "",
    can_call_countries: "US,CA",
  });

  // Fetch phone numbers (SLUG tenant_id)
  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ["voice-phone-numbers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_phone_numbers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) { console.error("[VoicePhoneNumbers] Error:", error); return []; }
      return (data || []) as PhoneNumber[];
    },
    enabled: !!tenantId,
  });

  // Add phone number + register with n8n
  const addMutation = useMutation({
    mutationFn: async (data: typeof newNumber) => {
      const canCallArr = (data.can_call_countries || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

      // 1. Insert into Supabase
      const { data: inserted, error } = await supabase
        .from("tenant_phone_numbers")
        .insert({
          tenant_id: tenantId,
          phone_number: data.phone_number,
          country_code: data.country_code,
          provider: data.provider,
          provider_id: data.provider_id || null,
          number_type: data.number_type,
          direction: data.direction,
          assigned_to: data.assigned_to,
          vapi_assistant_id: data.vapi_assistant_id || null,
          notes: data.notes || null,
          label: data.label || null,
          can_call_countries: canCallArr.length > 0 ? canCallArr : null,
          country_name: COUNTRY_NAMES[data.country_code] || null,
        })
        .select()
        .maybeSingle();
      if (error) throw error;

      // 2. If VAPI provider, register via n8n webhook
      if (data.provider === "vapi" && data.provider_id) {
        try {
          await fetch("https://webhooks.zatesystems.com/webhook/voice/register-phone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenant_id: tenantId,
              phone_number: data.phone_number,
              provider_id: data.provider_id,
              assistant_id: tenantConfig?.vapi_assistant_id || data.vapi_assistant_id,
              action: "register",
            }),
          });
        } catch (webhookErr) {
          console.warn("[VoicePhoneNumbers] n8n registration webhook failed (non-blocking):", webhookErr);
        }
      }

      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-phone-numbers"] });
      setShowAddForm(false);
      setNewNumber({
        phone_number: "", country_code: "US", provider: "vapi", provider_id: "",
        number_type: "local", direction: "both", assigned_to: "sales",
        vapi_assistant_id: "", notes: "", label: "", can_call_countries: "US,CA",
      });
      toast({ title: "Phone number added", description: "The number has been registered successfully." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("tenant_phone_numbers")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voice-phone-numbers"] }),
  });

  // Set as Primary (inbound or outbound)
  const setPrimaryMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "inbound" | "outbound" }) => {
      const field = type === "inbound" ? "is_primary_inbound" : "is_primary_outbound";
      // Clear all existing primary flags for this type
      const { error: clearErr } = await supabase
        .from("tenant_phone_numbers")
        .update({ [field]: false, updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId!);
      if (clearErr) throw clearErr;
      // Set the selected one as primary
      const { error: setErr } = await supabase
        .from("tenant_phone_numbers")
        .update({ [field]: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (setErr) throw setErr;
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["voice-phone-numbers"] });
      toast({ title: "Primary updated", description: `Primary ${type} number has been set.` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Delete phone number
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenant_phone_numbers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-phone-numbers"] });
      toast({ title: "Deleted", description: "Phone number removed." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Sync from VAPI via n8n webhook
  const handleSyncFromVAPI = async () => {
    if (!tenantId) return;
    setIsSyncing(true);
    try {
      const resp = await fetch("https://webhooks.zatesystems.com/webhook/voice/sync-phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          assistant_id: tenantConfig?.vapi_assistant_id || null,
        }),
      });
      if (resp.ok) {
        toast({ title: "Sync initiated", description: "Fetching phone numbers from VAPI..." });
        // Give n8n a moment to process, then refresh
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["voice-phone-numbers"] });
        }, 3000);
      } else {
        toast({ title: "Sync failed", description: "Could not reach sync endpoint.", variant: "destructive" });
      }
    } catch (err: any) {
      // Even if webhook isn't live yet, just refresh local data
      queryClient.invalidateQueries({ queryKey: ["voice-phone-numbers"] });
      toast({ title: "Refreshed", description: "Local phone numbers refreshed." });
    } finally {
      setIsSyncing(false);
    }
  };

  // Lead country distribution for coverage (SLUG tenant_id)
  const { data: leadCountries = [] } = useQuery({
    queryKey: ["voice-phone-lead-countries", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("sales_leads").select("country").eq("tenant_id", tenantConfig?.id);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((l: any) => {
        const c = (l.country || "").trim();
        if (c && c !== "Unknown") counts[c] = (counts[c] || 0) + 1;
      });
      return Object.entries(counts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
    },
    enabled: !!tenantId,
  });

  const activeNumbers = phoneNumbers.filter((p) => p.is_active);
  const callableCountries = [...new Set(activeNumbers.flatMap((p: any) => p.can_call_countries || []))];
  const hasNoNumbers = phoneNumbers.length === 0;
  const coverageGaps = leadCountries.filter((lc) => {
    const code = lc.country === "UAE" ? "AE" : lc.country === "UK" ? "GB" : lc.country;
    return !callableCountries.includes(code);
  });

  const primaryInbound = phoneNumbers.find((p) => p.is_primary_inbound);
  const primaryOutbound = phoneNumbers.find((p) => p.is_primary_outbound);

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {phoneNumbers.length} number{phoneNumbers.length !== 1 ? "s" : ""} registered
          {activeNumbers.length !== phoneNumbers.length && ` (${activeNumbers.length} active)`}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncFromVAPI} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            {isSyncing ? "Syncing..." : "Sync from VAPI"}
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showAddForm ? "Cancel" : "Add Number"}
          </Button>
        </div>
      </div>

      {/* Primary Number Summary */}
      {phoneNumbers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <PhoneIncoming className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Primary Inbound</p>
                  <p className="font-mono font-medium text-sm">
                    {primaryInbound ? (
                      <>{COUNTRY_FLAGS[primaryInbound.country_code] || ""} {primaryInbound.phone_number}</>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </p>
                </div>
                {primaryInbound && <Badge className="bg-blue-100 text-blue-700"><Shield className="h-3 w-3 mr-1" />Active</Badge>}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <PhoneOutgoing className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Primary Outbound</p>
                  <p className="font-mono font-medium text-sm">
                    {primaryOutbound ? (
                      <>{COUNTRY_FLAGS[primaryOutbound.country_code] || ""} {primaryOutbound.phone_number}</>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </p>
                </div>
                {primaryOutbound && <Badge className="bg-green-100 text-green-700"><Zap className="h-3 w-3 mr-1" />Active</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup Wizard — shown when tenant has zero phone numbers */}
      {hasNoNumbers && !showAddForm && (
        <SmartSetupWizard
          onComplete={() => setShowAddForm(true)}
          onSyncVAPI={handleSyncFromVAPI}
          isSyncing={isSyncing}
          tenantId={tenantId}
        />
      )}

      {/* Coverage Gaps */}
      {coverageGaps.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">Unreachable Leads by Country</p>
                <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                  These leads cannot receive voice calls — no covering phone number.
                </p>
                <div className="flex flex-wrap gap-2">
                  {coverageGaps.map((g) => (
                    <div key={g.country} className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/50 rounded-full px-3 py-1 text-sm text-red-800 dark:text-red-200">
                      <span>{COUNTRY_FLAGS[g.country === "UAE" ? "AE" : g.country === "UK" ? "GB" : g.country] || "\u{1F310}"}</span>
                      <span className="font-medium">{g.count} {g.country} lead{g.count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Number Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Phone Number</CardTitle>
            <CardDescription>Register an existing number from your VAPI or Twilio account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number (E.164 format)</Label>
                <Input placeholder="+12125551234" value={newNumber.phone_number}
                  onChange={(e) => setNewNumber({ ...newNumber, phone_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.country_code}
                  onChange={(e) => setNewNumber({ ...newNumber, country_code: e.target.value })}>
                  {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>{COUNTRY_FLAGS[code]} {name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.provider}
                  onChange={(e) => setNewNumber({ ...newNumber, provider: e.target.value })}>
                  <option value="vapi">VAPI</option>
                  <option value="twilio">Twilio</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Provider Number ID {newNumber.provider === "vapi" ? "(VAPI Phone ID)" : "(optional)"}</Label>
                <Input placeholder={newNumber.provider === "vapi" ? "e.g. a3b9b3e0-94e8-..." : "Provider-specific ID"}
                  value={newNumber.provider_id}
                  onChange={(e) => setNewNumber({ ...newNumber, provider_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.direction}
                  onChange={(e) => setNewNumber({ ...newNumber, direction: e.target.value })}>
                  <option value="both">Inbound & Outbound</option>
                  <option value="inbound">Inbound Only</option>
                  <option value="outbound">Outbound Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.assigned_to}
                  onChange={(e) => setNewNumber({ ...newNumber, assigned_to: e.target.value })}>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="hr">HR</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input placeholder="e.g. US Sales Line" value={newNumber.label}
                  onChange={(e) => setNewNumber({ ...newNumber, label: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Can Call Countries (comma-separated codes)</Label>
                <Input placeholder="e.g. US,CA,GB" value={newNumber.can_call_countries}
                  onChange={(e) => setNewNumber({ ...newNumber, can_call_countries: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g. Main sales line for US market" value={newNumber.notes}
                onChange={(e) => setNewNumber({ ...newNumber, notes: e.target.value })} />
            </div>
            <Button onClick={() => addMutation.mutate(newNumber)}
              disabled={!newNumber.phone_number || addMutation.isPending}>
              {addMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Add & Register Number</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phone Numbers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" /> Registered Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading phone numbers...</span>
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No phone numbers registered yet</p>
              <p className="text-xs text-muted-foreground mt-1">Use the setup wizard above or add a number manually</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Manually
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {phoneNumbers.map((num) => (
                <div key={num.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    num.is_active ? "bg-white dark:bg-card" : "bg-muted/50 opacity-60"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">{COUNTRY_FLAGS[num.country_code] || "\u{1F310}"}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-medium">{num.phone_number}</span>
                          {num.label && <span className="text-xs text-muted-foreground">({num.label})</span>}
                          {num.is_primary_inbound && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              <PhoneIncoming className="h-3 w-3 mr-1" /> Primary In
                            </Badge>
                          )}
                          {num.is_primary_outbound && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                              <PhoneOutgoing className="h-3 w-3 mr-1" /> Primary Out
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{COUNTRY_NAMES[num.country_code] || num.country_code}</span>
                          <span>&middot;</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-medium ${PROVIDER_BADGES[num.provider]?.className || "bg-gray-100 text-gray-600"}`}>
                            {PROVIDER_BADGES[num.provider]?.label || num.provider}
                          </Badge>
                          <span>&middot;</span>
                          <span className="capitalize">{num.direction}</span>
                          <span>&middot;</span>
                          <span className="capitalize">{num.assigned_to}</span>
                          {(num.can_call_countries || []).length > 0 && (
                            <>
                              <span>&middot;</span>
                              <span>Calls: {(num.can_call_countries || []).join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Set as Primary buttons */}
                      {num.is_active && !num.is_primary_inbound && (num.direction === "both" || num.direction === "inbound") && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2"
                          onClick={() => setPrimaryMutation.mutate({ id: num.id, type: "inbound" })}
                          disabled={setPrimaryMutation.isPending}>
                          <Star className="h-3 w-3 mr-1" /> Set Inbound
                        </Button>
                      )}
                      {num.is_active && !num.is_primary_outbound && (num.direction === "both" || num.direction === "outbound") && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 px-2"
                          onClick={() => setPrimaryMutation.mutate({ id: num.id, type: "outbound" })}
                          disabled={setPrimaryMutation.isPending}>
                          <Star className="h-3 w-3 mr-1" /> Set Outbound
                        </Button>
                      )}
                      <Badge className={num.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-600"}>
                        {num.is_active ? <><CheckCircle className="h-3 w-3 mr-1" /> Active</> : "Inactive"}
                      </Badge>
                      <Switch checked={num.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: num.id, is_active: checked })} />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this phone number? This cannot be undone.")) {
                            deleteMutation.mutate(num.id);
                          }
                        }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
