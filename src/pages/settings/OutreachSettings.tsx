import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Phone,
  MessageCircle,
  Shield,
  Save,
  X,
  Plus,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface OutreachSettings {
  email: {
    enabled: boolean;
    max_per_lead: number;
    max_per_day_total: number;
    min_gap_days: number;
    blocked_domains: string[];
    require_validation: boolean;
    stop_on_bounce: boolean;
    stop_on_reply: boolean;
    stop_on_unsubscribe: boolean;
    business_hours_only: boolean;
    start_hour: number;
    end_hour: number;
  };
  call: {
    enabled: boolean;
    max_per_lead: number;
    min_gap_days: number;
    block_toll_free: boolean;
    block_international_without_local_number: boolean;
    business_hours_only: boolean;
    start_hour: number;
    end_hour: number;
    allowed_days: string[];
  };
  whatsapp: {
    enabled: boolean;
    max_per_lead: number;
    min_gap_days: number;
  };
  general: {
    max_total_touches_per_lead: number;
    min_lead_score_for_outreach: number;
    exclude_anonymous_leads: boolean;
    require_company_name: boolean;
    daily_outreach_limit: number;
  };
}

const defaultSettings: OutreachSettings = {
  email: {
    enabled: true,
    max_per_lead: 5,
    max_per_day_total: 50,
    min_gap_days: 3,
    blocked_domains: [".gov", ".edu", ".mil", ".int", "senate", "treasury", "police", "court", "sheriff"],
    require_validation: true,
    stop_on_bounce: true,
    stop_on_reply: true,
    stop_on_unsubscribe: true,
    business_hours_only: true,
    start_hour: 9,
    end_hour: 18,
  },
  call: {
    enabled: true,
    max_per_lead: 2,
    min_gap_days: 3,
    block_toll_free: true,
    block_international_without_local_number: true,
    business_hours_only: true,
    start_hour: 9,
    end_hour: 18,
    allowed_days: ["mon", "tue", "wed", "thu", "fri"],
  },
  whatsapp: {
    enabled: true,
    max_per_lead: 3,
    min_gap_days: 2,
  },
  general: {
    max_total_touches_per_lead: 10,
    min_lead_score_for_outreach: 30,
    exclude_anonymous_leads: true,
    require_company_name: false,
    daily_outreach_limit: 100,
  },
};

const ALL_DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export default function OutreachSettingsPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<OutreachSettings>(defaultSettings);
  const [newDomain, setNewDomain] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["outreach-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("tenant_config")
        .select("outreach_settings")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data?.outreach_settings as OutreachSettings | null;
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        email: { ...defaultSettings.email, ...savedSettings.email },
        call: { ...defaultSettings.call, ...savedSettings.call },
        whatsapp: { ...defaultSettings.whatsapp, ...savedSettings.whatsapp },
        general: { ...defaultSettings.general, ...savedSettings.general },
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("tenant_config")
        .update({ outreach_settings: settings, updated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach-settings", tenantId] });
      setHasChanges(false);
      toast({ title: "Settings saved", description: "Outreach settings updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const update = <S extends keyof OutreachSettings, K extends keyof OutreachSettings[S]>(
    section: S,
    key: K,
    value: OutreachSettings[S][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
    setHasChanges(true);
  };

  const addBlockedDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    if (!settings.email.blocked_domains.includes(d)) {
      update("email", "blocked_domains", [...settings.email.blocked_domains, d]);
    }
    setNewDomain("");
  };

  const removeBlockedDomain = (domain: string) => {
    update(
      "email",
      "blocked_domains",
      settings.email.blocked_domains.filter((d) => d !== domain)
    );
  };

  const toggleDay = (day: string) => {
    const current = settings.call.allowed_days;
    const newDays = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    update("call", "allowed_days", newDays);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Outreach & Safety Settings
          </h1>
          <p className="text-muted-foreground">
            Control how AI reaches out to your leads across all channels
          </p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!hasChanges || saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>You have unsaved changes. Changes take effect on the next automation cycle (every 5 minutes).</span>
        </div>
      )}

      {/* EMAIL SETTINGS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-lg">Email Settings</CardTitle>
                <CardDescription>Control automated email outreach limits</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(v) => update("email", "enabled", v)}
            />
          </div>
        </CardHeader>
        {settings.email.enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max emails per lead</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.email.max_per_lead}
                  onChange={(e) => update("email", "max_per_lead", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Max emails per day (total)</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={settings.email.max_per_day_total}
                  onChange={(e) => update("email", "max_per_day_total", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Min days between emails to same lead</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.email.min_gap_days}
                onChange={(e) => update("email", "min_gap_days", parseInt(e.target.value) || 1)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Business hours only</Label>
                <p className="text-xs text-muted-foreground">Only send emails during work hours</p>
              </div>
              <Switch
                checked={settings.email.business_hours_only}
                onCheckedChange={(v) => update("email", "business_hours_only", v)}
              />
            </div>
            {settings.email.business_hours_only && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start hour
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.email.start_hour}
                    onChange={(e) => update("email", "start_hour", parseInt(e.target.value) || 9)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End hour
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.email.end_hour}
                    onChange={(e) => update("email", "end_hour", parseInt(e.target.value) || 18)}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <Label className="font-medium">Auto-stop rules</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stop on bounce</span>
                <Switch
                  checked={settings.email.stop_on_bounce}
                  onCheckedChange={(v) => update("email", "stop_on_bounce", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stop on reply</span>
                <Switch
                  checked={settings.email.stop_on_reply}
                  onCheckedChange={(v) => update("email", "stop_on_reply", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Stop on unsubscribe</span>
                <Switch
                  checked={settings.email.stop_on_unsubscribe}
                  onCheckedChange={(v) => update("email", "stop_on_unsubscribe", v)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="font-medium">Blocked domains</Label>
              <p className="text-xs text-muted-foreground">
                Leads with these domains will never receive automated emails
              </p>
              <div className="flex flex-wrap gap-2">
                {settings.email.blocked_domains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="gap-1">
                    {domain}
                    <button onClick={() => removeBlockedDomain(domain)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. .gov or example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addBlockedDomain()}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addBlockedDomain}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* CALL SETTINGS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-500" />
              <div>
                <CardTitle className="text-lg">Call Settings</CardTitle>
                <CardDescription>Control AI-powered outbound calls</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.call.enabled}
              onCheckedChange={(v) => update("call", "enabled", v)}
            />
          </div>
        </CardHeader>
        {settings.call.enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max calls per lead</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.call.max_per_lead}
                  onChange={(e) => update("call", "max_per_lead", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Min days between calls</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.call.min_gap_days}
                  onChange={(e) => update("call", "min_gap_days", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Business hours only</Label>
                <p className="text-xs text-muted-foreground">Only make calls during work hours</p>
              </div>
              <Switch
                checked={settings.call.business_hours_only}
                onCheckedChange={(v) => update("call", "business_hours_only", v)}
              />
            </div>
            {settings.call.business_hours_only && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Start hour
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.call.start_hour}
                    onChange={(e) => update("call", "start_hour", parseInt(e.target.value) || 9)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> End hour
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={settings.call.end_hour}
                    onChange={(e) => update("call", "end_hour", parseInt(e.target.value) || 18)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Allowed days</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((d) => (
                  <Button
                    key={d.key}
                    variant={settings.call.allowed_days.includes(d.key) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(d.key)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm">Block toll-free numbers</span>
              <Switch
                checked={settings.call.block_toll_free}
                onCheckedChange={(v) => update("call", "block_toll_free", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Block international (no local number)</span>
              <Switch
                checked={settings.call.block_international_without_local_number}
                onCheckedChange={(v) => update("call", "block_international_without_local_number", v)}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* WHATSAPP SETTINGS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <CardTitle className="text-lg">WhatsApp Settings</CardTitle>
                <CardDescription>Control automated WhatsApp messaging</CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.whatsapp.enabled}
              onCheckedChange={(v) => update("whatsapp", "enabled", v)}
            />
          </div>
        </CardHeader>
        {settings.whatsapp.enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max messages per lead</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.whatsapp.max_per_lead}
                  onChange={(e) => update("whatsapp", "max_per_lead", parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Min days between messages</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.whatsapp.min_gap_days}
                  onChange={(e) => update("whatsapp", "min_gap_days", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* GENERAL SAFETY */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-lg">General Safety</CardTitle>
              <CardDescription>Cross-channel safety limits and lead quality filters</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Max total touches per lead (across all channels)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={settings.general.max_total_touches_per_lead}
              onChange={(e) =>
                update("general", "max_total_touches_per_lead", parseInt(e.target.value) || 1)
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Minimum lead score for outreach (0-100)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.general.min_lead_score_for_outreach]}
                onValueChange={([v]) => update("general", "min_lead_score_for_outreach", v)}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-medium w-10 text-right">
                {settings.general.min_lead_score_for_outreach}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Leads below this score will not receive automated outreach
            </p>
          </div>

          <div className="space-y-2">
            <Label>Daily outreach limit (all channels)</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={settings.general.daily_outreach_limit}
              onChange={(e) =>
                update("general", "daily_outreach_limit", parseInt(e.target.value) || 1)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Exclude anonymous leads</span>
              <p className="text-xs text-muted-foreground">Skip leads without a name</p>
            </div>
            <Switch
              checked={settings.general.exclude_anonymous_leads}
              onCheckedChange={(v) => update("general", "exclude_anonymous_leads", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Require company name</span>
              <p className="text-xs text-muted-foreground">Only reach out to leads with a company</p>
            </div>
            <Switch
              checked={settings.general.require_company_name}
              onCheckedChange={(v) => update("general", "require_company_name", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button at bottom */}
      <div className="flex justify-end pb-8">
        <Button
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
