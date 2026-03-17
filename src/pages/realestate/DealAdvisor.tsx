import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, DollarSign, Lightbulb, CheckCircle, BookOpen } from "lucide-react";
import { useREIntelligence } from "@/hooks/useREIntelligence";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";

const formatAED = (amount: number) => `AED ${amount.toLocaleString()}`;

interface DealAdviceResult {
  fee_breakdown?: Record<string, number>;
  total_transaction_cost?: number;
  incentives?: string[];
  positioning?: string[];
  checklist?: string[];
  knowledge_entries?: Array<{ title: string; content: string; category: string }>;
  deal_structure?: Record<string, unknown>;
}

export default function DealAdvisor() {
  const { getDealAdvice, isLoading } = useREIntelligence();
  const [result, setResult] = useState<DealAdviceResult | null>(null);

  const [form, setForm] = useState({
    deal_type: "sale",
    property_price: "",
    region_code: "uae",
    buyer_type: "end_user",
    financing: "cash",
  });

  const handleSubmit = async () => {
    if (!form.property_price) return;
    const data = await getDealAdvice({
      deal_type: form.deal_type,
      property_price: parseFloat(form.property_price),
      region_code: form.region_code,
      buyer_type: form.buyer_type,
      financing: form.financing,
    });
    if (data) setResult(data as DealAdviceResult);
  };

  return (
    <RTLWrapper>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-8 w-8" /> Deal Advisor
        </h1>
        <p className="text-muted-foreground">AI-powered deal structuring and fee analysis</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Deal Type</Label>
              <Select value={form.deal_type} onValueChange={(v) => setForm({ ...form, deal_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="rent">Rental</SelectItem>
                  <SelectItem value="off_plan">Off-Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Property Price (AED)</Label>
              <Input
                type="number"
                placeholder="e.g. 2,000,000"
                value={form.property_price}
                onChange={(e) => setForm({ ...form, property_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Buyer Type</Label>
              <Select value={form.buyer_type} onValueChange={(v) => setForm({ ...form, buyer_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="end_user">End User</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="first_time">First-Time Buyer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Financing</Label>
              <Select value={form.financing} onValueChange={(v) => setForm({ ...form, financing: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="developer_plan">Developer Payment Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.region_code} onValueChange={(v) => setForm({ ...form, region_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uae">UAE (Dubai)</SelectItem>
                  <SelectItem value="ksa">Saudi Arabia</SelectItem>
                  <SelectItem value="bahrain">Bahrain</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={isLoading || !form.property_price} className="w-full">
              {isLoading ? "Analyzing..." : "Get Deal Advice"}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="md:col-span-2 space-y-4">
          {result ? (
            <>
              {/* Fee Breakdown */}
              {result.fee_breakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" /> Fee Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(result.fee_breakdown).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b last:border-0">
                          <span className="text-sm capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="text-sm font-medium">{formatAED(value)}</span>
                        </div>
                      ))}
                      {result.total_transaction_cost != null && (
                        <div className="flex justify-between items-center py-2 font-bold text-base">
                          <span>Total Transaction Cost</span>
                          <span>{formatAED(result.total_transaction_cost)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Incentives */}
              {result.incentives && result.incentives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" /> Recommended Incentives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.incentives.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Checklist */}
              {result.checklist && result.checklist.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Deal Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Knowledge Entries */}
              {result.knowledge_entries && result.knowledge_entries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5" /> Related Knowledge
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.knowledge_entries.map((entry, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{entry.title}</span>
                          <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.content}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="flex items-center justify-center min-h-[400px]">
              <CardContent>
                <p className="text-muted-foreground text-center">Configure deal parameters and click Get Deal Advice</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </RTLWrapper>
  );
}
