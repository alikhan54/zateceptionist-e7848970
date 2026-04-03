import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield, DollarSign, Users, Building2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

interface RegionConfig {
  id: string;
  region_code: string;
  country_name: string;
  country_code: string;
  flag_emoji: string;
  currency_code: string;
  currency_symbol: string;
  regulatory_body: string;
  license_requirements: Record<string, unknown>;
  compliance_rules: Record<string, unknown>;
  transfer_fee_pct: number;
  transfer_fee_name: string;
  vat_rate: number;
  capital_gains_tax: boolean;
  capital_gains_rate: number;
  stamp_duty_brackets: Record<string, unknown>;
  additional_fees: Record<string, unknown>;
  golden_visa_enabled: boolean;
  golden_visa_minimum: number;
  golden_visa_currency: string;
  residency_programs: Record<string, unknown>;
  language_primary: string;
  rtl_support: boolean;
  is_active: boolean;
}

export default function RegionSettings() {
  const { data: regions = [], isLoading, error } = useQuery({
    queryKey: ["re_region_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("re_region_config" as any)
        .select("*")
        .eq("is_active", true)
        .order("country_name");
      if (error) throw error;
      return (data || []) as unknown as RegionConfig[];
    },
  });

  const renderJsonSection = (title: string, icon: React.ReactNode, data: Record<string, unknown> | undefined) => {
    if (!data || Object.keys(data).length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm flex items-center gap-2">{icon} {title}</h4>
        <div className="grid gap-1">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded text-sm">
              <span className="capitalize text-muted-foreground">{key.replace(/_/g, " ")}</span>
              <span className="font-medium">
                {typeof value === "boolean" ? (value ? "✅ Yes" : "❌ No") :
                 typeof value === "number" ? `${value}%` :
                 typeof value === "object" ? JSON.stringify(value) :
                 String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Globe className="h-8 w-8" /> Region Settings
        </h1>
        <p className="text-muted-foreground">Regulatory frameworks, tax rates, and compliance requirements by region</p>
      </div>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Failed to load data. Please try again.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center p-8 text-muted-foreground">Loading region configurations...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {regions.map((region) => (
            <Card key={region.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {region.flag_emoji} {region.country_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{region.currency_code}</Badge>
                    <Badge variant="secondary">{region.region_code.toUpperCase()}</Badge>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {region.regulatory_body} {region.rtl_support ? "• RTL" : ""} • {region.language_primary}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Fees & Taxes</h4>
                  <div className="grid gap-1">
                    <div className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded text-sm">
                      <span className="text-muted-foreground">{region.transfer_fee_name || "Transfer Fee"}</span>
                      <span className="font-medium">{region.transfer_fee_pct}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded text-sm">
                      <span className="text-muted-foreground">VAT Rate</span>
                      <span className="font-medium">{region.vat_rate}%</span>
                    </div>
                    <div className="flex justify-between items-center py-1 px-2 bg-muted/30 rounded text-sm">
                      <span className="text-muted-foreground">Capital Gains Tax</span>
                      <span className="font-medium">{region.capital_gains_tax ? `${region.capital_gains_rate}%` : "None"}</span>
                    </div>
                  </div>
                </div>

                {region.golden_visa_enabled && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Golden Visa</h4>
                    <div className="flex justify-between items-center py-1 px-2 bg-purple-50 rounded text-sm">
                      <span className="text-purple-700">Minimum Investment</span>
                      <span className="font-medium text-purple-700">{region.golden_visa_currency} {region.golden_visa_minimum?.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {renderJsonSection("Residency Programs", <Users className="h-4 w-4" />, region.residency_programs as Record<string, unknown>)}
                {renderJsonSection("License Requirements", <Shield className="h-4 w-4" />, region.license_requirements as Record<string, unknown>)}
                {renderJsonSection("Additional Fees", <DollarSign className="h-4 w-4" />, region.additional_fees as Record<string, unknown>)}
                {renderJsonSection("Compliance Rules", <Shield className="h-4 w-4" />, region.compliance_rules as Record<string, unknown>)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RTLWrapper>
  );
}
