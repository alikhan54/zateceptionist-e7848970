import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe2, DollarSign, Shield, FileText, Clock, Building2, Landmark, CreditCard, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";


const COUNTRIES = [
  { code: "pk", name: "Pakistan", flag: "🇵🇰" },
  { code: "gb", name: "United Kingdom", flag: "🇬🇧" },
  { code: "us", name: "United States", flag: "🇺🇸" },
  { code: "in", name: "India", flag: "🇮🇳" },
  { code: "sa", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "ca", name: "Canada", flag: "🇨🇦" },
  { code: "qa", name: "Qatar", flag: "🇶🇦" },
  { code: "ae", name: "UAE", flag: "🇦🇪" },
];

const PROPERTY_TYPES = ["apartment", "villa", "townhouse", "penthouse", "office", "land"];

interface CrossBorderResult {
  success: boolean;
  route: string;
  property: { price: number; type: string; currency: string };
  costs: {
    property_price: number;
    transfer_fee: number;
    agent_commission: number;
    vat_on_commission: number;
    estimated_total_fees: number;
    total_buyer_cost: number;
    fee_breakdown: Record<string, { pct?: number; flat?: string; note?: string }>;
  };
  tax_comparison: {
    buyer_country_cgt: string;
    target_country_cgt: string;
    tax_saving: string;
    double_tax_treaty: boolean;
    notes: string;
  };
  currency: { pair: string; volatility: string; recommendation: string };
  visa: { eligible: boolean; program: string; duration?: string; minimum?: number; note?: string };
  residency_path: string;
  legal: {
    required_documents: string[];
    ownership_structure: string;
    buyer_restrictions: string;
    target_restrictions: string;
    notes: string;
  };
  financing: { mortgage_available: boolean; max_ltv: string; notes: string };
  process: { typical_timeline_days: number; steps: { step: number; action: string; timeline: string }[] };
  execution_time_ms: number;
  error?: string;
  message?: string;
}

const CrossBorderAdvisor = () => {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { tenantId } = useTenant();
  const [buyerCountry, setBuyerCountry] = useState("pk");
  const [targetCountry, setTargetCountry] = useState("ae");
  const [propertyPrice, setPropertyPrice] = useState("2000000");
  const [propertyType, setPropertyType] = useState("apartment");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrossBorderResult | null>(null);

  const analyze = async () => {
    if (buyerCountry === targetCountry) {
      toast({ title: "Invalid selection", description: "Buyer and target country must be different", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const baseUrl = window.location.hostname === "localhost" ? "http://localhost:5678" : "https://webhooks.zatesystems.com";
      const resp = await fetch(`${baseUrl}/webhook/re-cross-border-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_country: buyerCountry,
          target_country: targetCountry,
          property_price: parseFloat(propertyPrice),
          property_type: propertyType,
          tenant_id: tenantId,
        }),
      });
      const data = await resp.json();
      setResult(data);
      if (!data.success) {
        toast({ title: "No data found", description: data.message || "No cross-border rules for this route", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buyerFlag = COUNTRIES.find((c) => c.code === buyerCountry)?.flag || "";
  const targetFlag = COUNTRIES.find((c) => c.code === targetCountry)?.flag || "";

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Globe2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Cross-Border Investment Advisor</h1>
            <p className="text-muted-foreground">Tax, visa, legal & cost analysis for international property buyers</p>
          </div>
        </div>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investment Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Buyer Country</Label>
                <Select value={buyerCountry} onValueChange={setBuyerCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Country</Label>
                <Select value={targetCountry} onValueChange={setTargetCountry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Price (AED)</Label>
                <Input type="number" value={propertyPrice} onChange={(e) => setPropertyPrice(e.target.value)} placeholder="2000000" />
              </div>
              <div>
                <Label>Property Type</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={analyze} disabled={loading} className="mt-4">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing...</> : <><Globe2 className="h-4 w-4 mr-2" /> Analyze Route</>}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result?.success && (
          <div className="space-y-4">
            <div className="text-lg font-semibold">{buyerFlag} {result.route} {targetFlag}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Costs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Cost Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Property Price</span><span className="font-medium">{formatPrice(result.costs.property_price)}</span></div>
                  <div className="flex justify-between"><span>Transfer Fee (4%)</span><span>{formatPrice(result.costs.transfer_fee)}</span></div>
                  <div className="flex justify-between"><span>Agent Commission (2%)</span><span>{formatPrice(result.costs.agent_commission)}</span></div>
                  <div className="flex justify-between"><span>VAT on Commission</span><span>{formatPrice(result.costs.vat_on_commission)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold"><span>Total Buyer Cost</span><span className="text-blue-600">{formatPrice(result.costs.total_buyer_cost)}</span></div>
                  {result.costs.fee_breakdown && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {Object.entries(result.costs.fee_breakdown).map(([key, val]) => (
                        <div key={key} className="flex justify-between text-xs text-muted-foreground">
                          <span>{key.replace(/_/g, " ")}</span>
                          <span>{val.pct ? `${val.pct}%` : val.flat || ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tax */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Landmark className="h-4 w-4" /> Tax Comparison</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Buyer Country CGT</span><span className="font-medium">{result.tax_comparison.buyer_country_cgt}</span></div>
                  <div className="flex justify-between"><span>Target Country CGT</span><span className="font-medium text-green-600">{result.tax_comparison.target_country_cgt}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span>Tax Saving</span><span className="font-bold text-green-600">{result.tax_comparison.tax_saving}</span></div>
                  <div className="flex justify-between items-center">
                    <span>Double Tax Treaty</span>
                    <Badge variant={result.tax_comparison.double_tax_treaty ? "default" : "secondary"}>
                      {result.tax_comparison.double_tax_treaty ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {result.tax_comparison.notes && <p className="text-xs text-muted-foreground mt-2">{result.tax_comparison.notes}</p>}
                </CardContent>
              </Card>

              {/* Visa */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Visa & Residency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {result.visa.eligible ? (
                      <><CheckCircle2 className="h-5 w-5 text-green-600" /><span className="font-medium text-green-600">Eligible</span></>
                    ) : (
                      <><AlertCircle className="h-5 w-5 text-yellow-600" /><span className="font-medium text-yellow-600">Not Eligible</span></>
                    )}
                  </div>
                  <div className="flex justify-between"><span>Program</span><Badge>{result.visa.program}</Badge></div>
                  {result.visa.duration && <div className="flex justify-between"><span>Duration</span><span>{result.visa.duration}</span></div>}
                  {result.visa.minimum && <div className="flex justify-between"><span>Minimum</span><span>{formatPrice(result.visa.minimum)}</span></div>}
                  {result.residency_path && <p className="text-xs text-muted-foreground mt-2">{result.residency_path}</p>}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Currency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="h-4 w-4" /> Currency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Pair</span><span className="font-medium">{result.currency.pair}</span></div>
                  <div className="flex justify-between"><span>Volatility</span>
                    <Badge variant={result.currency.volatility === "low" ? "default" : result.currency.volatility === "medium" ? "secondary" : "destructive"}>
                      {result.currency.volatility}
                    </Badge>
                  </div>
                  {result.currency.recommendation && <p className="text-xs text-muted-foreground">{result.currency.recommendation}</p>}
                </CardContent>
              </Card>

              {/* Financing */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Financing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Mortgage Available</span>
                    <Badge variant={result.financing.mortgage_available ? "default" : "secondary"}>
                      {result.financing.mortgage_available ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between"><span>Max LTV</span><span className="font-medium">{result.financing.max_ltv}</span></div>
                  {result.financing.notes && <p className="text-xs text-muted-foreground">{result.financing.notes}</p>}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Required Documents */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Required Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {result.legal.required_documents?.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2"><CheckCircle2 className="h-3 w-3 mt-1 text-green-600 shrink-0" />{doc}</li>
                    ))}
                  </ul>
                  {result.legal.ownership_structure && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium">Recommended Structure</p>
                      <p className="text-xs text-muted-foreground">{result.legal.ownership_structure}</p>
                    </div>
                  )}
                  {result.legal.notes && <p className="text-xs text-muted-foreground mt-2">{result.legal.notes}</p>}
                </CardContent>
              </Card>

              {/* Process Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Process ({result.process.typical_timeline_days} days typical)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.process.steps?.map((s) => (
                      <div key={s.step} className="flex items-start gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
                        <div>
                          <p className="font-medium">{s.action}</p>
                          <p className="text-xs text-muted-foreground">{s.timeline}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Legal Restrictions */}
            {(result.legal.buyer_restrictions || result.legal.target_restrictions) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Regulatory Notes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {result.legal.buyer_restrictions && (
                    <div><p className="font-medium text-xs mb-1">Buyer Country Restrictions</p><p className="text-muted-foreground text-xs">{result.legal.buyer_restrictions}</p></div>
                  )}
                  {result.legal.target_restrictions && (
                    <div><p className="font-medium text-xs mb-1">Target Country Restrictions</p><p className="text-muted-foreground text-xs">{result.legal.target_restrictions}</p></div>
                  )}
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground text-right">Analysis completed in {result.execution_time_ms}ms</p>
          </div>
        )}

        {result && !result.success && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <p>{result.message || "No cross-border rules found for this route"}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RTLWrapper>
  );
};

export default CrossBorderAdvisor;
