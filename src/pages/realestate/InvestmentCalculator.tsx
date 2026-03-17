import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useREIntelligence } from "@/hooks/useREIntelligence";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

const regions = [
  { code: "uae", label: "UAE (Dubai)" },
  { code: "ksa", label: "Saudi Arabia" },
  { code: "bahrain", label: "Bahrain" },
  { code: "oman", label: "Oman" },
  { code: "qatar", label: "Qatar" },
  { code: "uk", label: "United Kingdom" },
  { code: "turkey", label: "Turkey" },
  { code: "egypt", label: "Egypt" },
];

interface YieldResult {
  yields?: {
    gross_yield_pct?: number;
    net_yield_pct?: number;
    annual_net_income?: number;
    cost_breakdown?: Record<string, number>;
  };
  ten_year_projections?: {
    bear?: { total_return: number; annual_avg: number; values?: number[] };
    base?: { total_return: number; annual_avg: number; values?: number[] };
    bull?: { total_return: number; annual_avg: number; values?: number[] };
  };
}

export default function InvestmentCalculator() {
  const { calculateYield, isLoading } = useREIntelligence();
  const [result, setResult] = useState<YieldResult | null>(null);

  const [form, setForm] = useState({
    purchase_price: "",
    annual_rent: "",
    service_charge: "",
    size_sqft: "",
    region_code: "uae",
  });

  const handleCalculate = async () => {
    if (!form.purchase_price || !form.annual_rent) return;
    const data = await calculateYield({
      purchase_price: parseFloat(form.purchase_price),
      annual_rent: parseFloat(form.annual_rent),
      service_charge: form.service_charge ? parseFloat(form.service_charge) : undefined,
      size_sqft: form.size_sqft ? parseFloat(form.size_sqft) : undefined,
      region_code: form.region_code,
    });
    if (data) setResult(data as YieldResult);
  };

  const yields = result?.yields;
  const projections = result?.ten_year_projections;

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-8 w-8" /> Investment Calculator
        </h1>
        <p className="text-muted-foreground">Calculate rental yields and project returns for Dubai properties</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Price (AED)</Label>
              <Input
                type="number"
                placeholder="e.g. 1,500,000"
                value={form.purchase_price}
                onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Annual Rent (AED)</Label>
              <Input
                type="number"
                placeholder="e.g. 90,000"
                value={form.annual_rent}
                onChange={(e) => setForm({ ...form, annual_rent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Annual Service Charge (AED)</Label>
              <Input
                type="number"
                placeholder="e.g. 15,000"
                value={form.service_charge}
                onChange={(e) => setForm({ ...form, service_charge: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Property Size (sqft)</Label>
              <Input
                type="number"
                placeholder="e.g. 1,200"
                value={form.size_sqft}
                onChange={(e) => setForm({ ...form, size_sqft: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region_code} onValueChange={(v) => setForm({ ...form, region_code: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCalculate} disabled={isLoading || !form.purchase_price || !form.annual_rent} className="w-full">
              {isLoading ? "Calculating..." : "Calculate Yield"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {yields ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Yield Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Gross Yield</p>
                    <p className="text-3xl font-bold text-green-700">{(yields.gross_yield_pct ?? 0).toFixed(1)}%</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Net Yield</p>
                    <p className="text-3xl font-bold text-blue-700">{(yields.net_yield_pct ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
                {yields.annual_net_income != null && (
                  <div className="mt-4 text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Annual Net Income</p>
                    <p className="text-xl font-bold">{formatAED(yields.annual_net_income)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {yields.cost_breakdown && Object.keys(yields.cost_breakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(yields.cost_breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-1 border-b last:border-0">
                        <span className="text-sm capitalize">{key.replace(/_/g, " ")}</span>
                        <span className="text-sm font-medium">{formatAED(value as number)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px]">
            <CardContent>
              <p className="text-muted-foreground text-center">Enter property details and click Calculate to see yield analysis</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 10-Year Projections */}
      {projections && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> 10-Year Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {(["bear", "base", "bull"] as const).map((scenario) => {
                const p = projections[scenario];
                if (!p) return null;
                const colors = { bear: "red", base: "blue", bull: "green" };
                const labels = { bear: "Conservative", base: "Base Case", bull: "Optimistic" };
                return (
                  <div key={scenario} className={`p-4 rounded-lg bg-${colors[scenario]}-50 border border-${colors[scenario]}-200`}>
                    <Badge variant="outline" className="mb-2">{labels[scenario]}</Badge>
                    <p className="text-2xl font-bold">{formatAED(p.total_return)}</p>
                    <p className="text-sm text-muted-foreground">Total Return</p>
                    <p className="text-lg font-semibold mt-2">{p.annual_avg?.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Avg Annual Return</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </RTLWrapper>
  );
}
