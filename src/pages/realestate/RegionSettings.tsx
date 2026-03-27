import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Shield, DollarSign, Users, Building2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

interface RegionConfig {
  id: string;
  region_code: string;
  region_name: string;
  country: string;
  currency: string;
  regulatory_body: string;
  ownership_rules: Record<string, unknown>;
  tax_rates: Record<string, unknown>;
  visa_programs: Record<string, unknown>;
  transaction_fees: Record<string, unknown>;
  compliance_requirements: string[];
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
        .order("region_name");
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
                    {region.region_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{region.currency}</Badge>
                    <Badge variant="secondary">{region.region_code.toUpperCase()}</Badge>
                  </div>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{region.country} • Regulatory: {region.regulatory_body}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderJsonSection("Ownership Rules", <Shield className="h-4 w-4" />, region.ownership_rules)}
                {renderJsonSection("Tax Rates", <DollarSign className="h-4 w-4" />, region.tax_rates)}
                {renderJsonSection("Transaction Fees", <DollarSign className="h-4 w-4" />, region.transaction_fees)}
                {renderJsonSection("Visa Programs", <Users className="h-4 w-4" />, region.visa_programs)}

                {region.compliance_requirements && region.compliance_requirements.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Compliance</h4>
                    <div className="flex flex-wrap gap-1">
                      {region.compliance_requirements.map((req, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{req}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RTLWrapper>
  );
}
