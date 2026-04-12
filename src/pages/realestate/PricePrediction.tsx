import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, TrendingUp, TrendingDown, Minus, Clock, Target, DollarSign, BarChart3, Loader2 } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useCurrency } from "@/hooks/useCurrency";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prediction {
  predicted_price_low: number;
  predicted_price_mid: number;
  predicted_price_high: number;
  predicted_price_per_sqft: number;
  confidence_score: number;
  price_position: string;
  position_percentage: number;
  optimal_listing_price: number;
  expected_days_on_market: number;
  best_listing_month: string;
  pricing_strategy: string;
  forecast_3m: { price_change_pct: number; confidence: number };
  forecast_6m: { price_change_pct: number; confidence: number };
  forecast_12m: { price_change_pct: number; confidence: number };
  reasoning: string;
  comparable_count?: number;
  community_avg_price_sqft?: number;
}

const PROPERTY_TYPES = ["apartment", "villa", "townhouse", "penthouse", "studio", "commercial"];
const VIEW_TYPES = ["sea", "city", "garden", "pool", "community", "none"];
const CONDITIONS = ["new", "excellent", "good", "fair", "needs_renovation"];
const FURNISHINGS = ["furnished", "semi_furnished", "unfurnished"];

// formatPrice is provided by useCurrency hook inside the component

function getPositionColor(position: string): string {
  switch (position) {
    case "below_market": return "text-green-600";
    case "at_market": return "text-blue-600";
    case "above_market": return "text-amber-600";
    case "premium": return "text-purple-600";
    default: return "text-gray-600";
  }
}

function getStrategyBadge(strategy: string) {
  const colors: Record<string, string> = {
    aggressive: "bg-red-100 text-red-700",
    market_rate: "bg-blue-100 text-blue-700",
    premium: "bg-purple-100 text-purple-700",
    value_play: "bg-green-100 text-green-700",
  };
  return colors[strategy] || "bg-gray-100 text-gray-700";
}

export default function PricePrediction() {
  const { tenantId } = useTenant();
  const { formatPrice } = useCurrency();
  const [communities, setCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const [form, setForm] = useState({
    community: "",
    property_type: "apartment",
    bedrooms: "2",
    bathrooms: "2",
    size_sqft: "1200",
    floor_number: "",
    view_type: "community",
    condition: "good",
    furnishing: "unfurnished",
    listing_id: "",
  });

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("re_market_data" as any)
      .select("community")
      .eq("tenant_id", tenantId)
      .order("community")
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set((data as any[]).map((d: any) => d.community))];
          setCommunities(unique as string[]);
          if (unique.length > 0 && !form.community) {
            setForm((f) => ({ ...f, community: unique[0] as string }));
          }
        }
      });
  }, [tenantId]);

  const handlePredict = async () => {
    if (!form.community || !form.size_sqft) {
      toast.error("Community and size are required");
      return;
    }
    setLoading(true);
    setPrediction(null);
    try {
      const payload: Record<string, unknown> = {
        tenant_id: tenantId,
        community: form.community,
        property_type: form.property_type,
        bedrooms: parseInt(form.bedrooms) || 0,
        bathrooms: parseInt(form.bathrooms) || 1,
        size_sqft: parseFloat(form.size_sqft),
        view_type: form.view_type,
        condition: form.condition,
        furnishing: form.furnishing,
      };
      if (form.floor_number) payload.floor_number = parseInt(form.floor_number);
      if (form.listing_id) payload.listing_id = form.listing_id;

      const result = await callWebhook("re-price-predict", payload, tenantId);
      if (result.success && (result.data as any)?.prediction) {
        setPrediction((result.data as any).prediction);
        toast.success("Price prediction generated");
      } else {
        toast.error((result.data as any)?.message || result.error || "Prediction failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get prediction");
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const trendIcon = (pct: number) => {
    if (pct > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (pct < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <h1 className="text-2xl font-bold">AI Price Prediction</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel — Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Community</label>
                  <Select value={form.community} onValueChange={(v) => setForm({ ...form, community: v })}>
                    <SelectTrigger><SelectValue placeholder="Select community" /></SelectTrigger>
                    <SelectContent>
                      {communities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Property Type</label>
                  <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Bedrooms</label>
                  <Input type="number" min="0" max="10" value={form.bedrooms}
                    onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Bathrooms</label>
                  <Input type="number" min="1" max="10" value={form.bathrooms}
                    onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Size (sqft)</label>
                  <Input type="number" min="100" value={form.size_sqft}
                    onChange={(e) => setForm({ ...form, size_sqft: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Floor Number</label>
                  <Input type="number" min="0" max="100" value={form.floor_number} placeholder="Optional"
                    onChange={(e) => setForm({ ...form, floor_number: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">View Type</label>
                  <Select value={form.view_type} onValueChange={(v) => setForm({ ...form, view_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VIEW_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Condition</label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Furnishing</label>
                  <Select value={form.furnishing} onValueChange={(v) => setForm({ ...form, furnishing: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FURNISHINGS.map((f) => (
                        <SelectItem key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1).replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handlePredict} disabled={loading} className="w-full mt-4" size="lg">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI is analyzing market data...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Predict Price</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Right Panel — Results */}
          <div className="space-y-4">
            {!prediction && !loading && (
              <Card className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Enter property details and click Predict Price</p>
                </div>
              </Card>
            )}

            {loading && (
              <Card className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-purple-600" />
                  <p className="text-sm text-muted-foreground">Analyzing market data, comparables, and trends...</p>
                </div>
              </Card>
            )}

            {prediction && (
              <>
                {/* Price Range */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" /> Price Estimate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center mb-4">
                      <p className="text-3xl font-bold text-purple-700">{formatPrice(prediction.predicted_price_mid)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(prediction.predicted_price_low)} — {formatPrice(prediction.predicted_price_high)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Price/sqft:</span>
                        <span className="ml-1 font-medium">{formatPrice(prediction.predicted_price_per_sqft || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Community avg:</span>
                        <span className="ml-1 font-medium">{formatPrice(prediction.community_avg_price_sqft || 0)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Position:</span>
                        <span className={`ml-1 font-medium ${getPositionColor(prediction.price_position)}`}>
                          {prediction.price_position?.replace("_", " ")} ({prediction.position_percentage > 0 ? "+" : ""}{prediction.position_percentage}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Comparables:</span>
                        <span className="ml-1 font-medium">{prediction.comparable_count || 0} found</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence & Strategy */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Confidence</p>
                      <p className={`text-2xl font-bold ${confidenceColor(prediction.confidence_score)}`}>
                        {prediction.confidence_score}%
                      </p>
                      <Progress value={prediction.confidence_score} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-1">Strategy</p>
                      <Badge className={getStrategyBadge(prediction.pricing_strategy)}>
                        {prediction.pricing_strategy?.replace("_", " ")}
                      </Badge>
                      <div className="mt-2 text-sm">
                        <Target className="h-3 w-3 inline mr-1" />
                        List at {formatPrice(prediction.optimal_listing_price)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Forecasts */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" /> Price Forecasts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "3 months", data: prediction.forecast_3m },
                        { label: "6 months", data: prediction.forecast_6m },
                        { label: "12 months", data: prediction.forecast_12m },
                      ].map(({ label, data }) => (
                        <div key={label} className="text-center p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            {trendIcon(data.price_change_pct)}
                            <span className={`text-lg font-semibold ${data.price_change_pct >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {data.price_change_pct > 0 ? "+" : ""}{data.price_change_pct}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">conf: {data.confidence}%</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Timing & Reasoning */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>~{prediction.expected_days_on_market} days on market</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span>Best month: {prediction.best_listing_month}</span>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">AI Reasoning</p>
                      <p className="text-sm text-muted-foreground">{prediction.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </RTLWrapper>
  );
}
