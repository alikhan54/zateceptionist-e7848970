import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  Settings2,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
} from "lucide-react";

interface PhoneNumber {
  id: string;
  tenant_id: string;
  phone_number: string;
  country_code: string;
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
  notes: string | null;
  purchased_at: string | null;
  created_at: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: "\u{1F1FA}\u{1F1F8}",
  CA: "\u{1F1E8}\u{1F1E6}",
  GB: "\u{1F1EC}\u{1F1E7}",
  AE: "\u{1F1E6}\u{1F1EA}",
  IN: "\u{1F1EE}\u{1F1F3}",
  AU: "\u{1F1E6}\u{1F1FA}",
  DE: "\u{1F1E9}\u{1F1EA}",
  FR: "\u{1F1EB}\u{1F1F7}",
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AE: "UAE",
  IN: "India",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
};

export default function PhoneNumbers() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
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

  // Fetch phone numbers
  const { data: phoneNumbers = [], isLoading } = useQuery({
    queryKey: ["phone-numbers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_phone_numbers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[PhoneNumbers] Error:", error);
        return [];
      }
      return (data || []) as PhoneNumber[];
    },
    enabled: !!tenantId,
  });

  // Add phone number mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof newNumber) => {
      const canCallArr = (data.can_call_countries || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("tenant_phone_numbers").insert({
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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      setShowAddForm(false);
      setNewNumber({
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
      toast({ title: "Phone number added", description: "The number has been registered." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("tenant_phone_numbers")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
    },
  });

  // Lead country distribution for coverage analysis
  const { data: leadCountries = [] } = useQuery({
    queryKey: ["lead-country-dist", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("sales_leads")
        .select("country")
        .eq("tenant_id", tenantId);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((l: any) => {
        const c = (l.country || "").trim();
        if (c) counts[c] = (counts[c] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!tenantId,
  });

  // Check if we have international coverage
  const countries = [...new Set(phoneNumbers.filter(p => p.is_active).map(p => p.country_code))];
  const callableCountries = [...new Set(phoneNumbers.filter(p => p.is_active).flatMap((p: any) => p.can_call_countries || []))];
  const hasOnlyUS = countries.length === 1 && countries[0] === "US";
  const hasNoNumbers = phoneNumbers.length === 0;

  // Coverage gaps
  const coverageGaps = leadCountries.filter(lc => {
    const code = lc.country === "UAE" ? "AE" : lc.country === "UK" ? "GB" : lc.country;
    return !callableCountries.includes(code) && lc.country !== "Unknown" && lc.country !== "Other";
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Phone Numbers</h1>
          <p className="text-muted-foreground">Manage voice numbers for AI calls</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showAddForm ? "Cancel" : "Add Number"}
        </Button>
      </div>

      {/* Warning Banner */}
      {(hasOnlyUS || hasNoNumbers) && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">
                  {hasNoNumbers ? "No phone numbers configured" : "Limited international coverage"}
                </p>
                <p className="text-sm text-amber-600">
                  {hasNoNumbers
                    ? "Add a phone number to enable AI voice calls."
                    : "You only have US numbers. International leads (UAE, UK, etc.) cannot be reached. Add numbers for other countries to expand coverage."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coverage Gap Analysis */}
      {coverageGaps.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Unreachable Leads by Country</p>
                <p className="text-sm text-red-600 mb-2">These leads cannot receive voice calls because you have no phone number that covers their country.</p>
                <div className="flex flex-wrap gap-2">
                  {coverageGaps.map(g => (
                    <div key={g.country} className="flex items-center gap-1.5 bg-red-100 rounded-full px-3 py-1 text-sm text-red-800">
                      <span>{COUNTRY_FLAGS[g.country === "UAE" ? "AE" : g.country === "UK" ? "GB" : g.country] || "\u{1F310}"}</span>
                      <span className="font-medium">{g.count} {g.country} lead{g.count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-500 mt-2">
                  Total unreachable: {coverageGaps.reduce((s, g) => s + g.count, 0)} leads
                </p>
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
                <Input
                  placeholder="+12125551234"
                  value={newNumber.phone_number}
                  onChange={(e) => setNewNumber({ ...newNumber, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.country_code}
                  onChange={(e) => setNewNumber({ ...newNumber, country_code: e.target.value })}
                >
                  {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>{COUNTRY_FLAGS[code]} {name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.provider}
                  onChange={(e) => setNewNumber({ ...newNumber, provider: e.target.value })}
                >
                  <option value="vapi">VAPI</option>
                  <option value="twilio">Twilio</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Provider Number ID (optional)</Label>
                <Input
                  placeholder="e.g. a3b9b3e0-..."
                  value={newNumber.provider_id}
                  onChange={(e) => setNewNumber({ ...newNumber, provider_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.direction}
                  onChange={(e) => setNewNumber({ ...newNumber, direction: e.target.value })}
                >
                  <option value="both">Inbound & Outbound</option>
                  <option value="inbound">Inbound Only</option>
                  <option value="outbound">Outbound Only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newNumber.assigned_to}
                  onChange={(e) => setNewNumber({ ...newNumber, assigned_to: e.target.value })}
                >
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
                <Input
                  placeholder="e.g. US Sales Line"
                  value={newNumber.label}
                  onChange={(e) => setNewNumber({ ...newNumber, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Can Call Countries (comma-separated codes)</Label>
                <Input
                  placeholder="e.g. US,CA,GB"
                  value={newNumber.can_call_countries}
                  onChange={(e) => setNewNumber({ ...newNumber, can_call_countries: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g. Main sales line for US market"
                value={newNumber.notes}
                onChange={(e) => setNewNumber({ ...newNumber, notes: e.target.value })}
              />
            </div>
            <Button
              onClick={() => addMutation.mutate(newNumber)}
              disabled={!newNumber.phone_number || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add Number"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phone Numbers List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Registered Numbers
          </CardTitle>
          <CardDescription>{phoneNumbers.length} number{phoneNumbers.length !== 1 ? "s" : ""} configured</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No phone numbers registered yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Number
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {phoneNumbers.map((num) => (
                <div
                  key={num.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    num.is_active ? "bg-white" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{COUNTRY_FLAGS[num.country_code] || "\u{1F310}"}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{num.phone_number}</span>
                        {num.is_primary_inbound && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            <PhoneIncoming className="h-3 w-3 mr-1" />
                            Primary In
                          </Badge>
                        )}
                        {num.is_primary_outbound && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                            <PhoneOutgoing className="h-3 w-3 mr-1" />
                            Primary Out
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{COUNTRY_NAMES[num.country_code] || num.country_code}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{num.provider}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{num.direction}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{num.assigned_to}</span>
                        {num.notes && (
                          <>
                            <span>&middot;</span>
                            <span>{num.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={num.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                      {num.is_active ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                      ) : (
                        "Inactive"
                      )}
                    </Badge>
                    <Switch
                      checked={num.is_active}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: num.id, is_active: checked })}
                    />
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
