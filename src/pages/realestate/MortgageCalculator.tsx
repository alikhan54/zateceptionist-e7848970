import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { DollarSign, Building2, Globe, Award, Calculator, Loader2, CheckCircle, XCircle } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useCurrency } from "@/hooks/useCurrency";
import { useMortgageCalculator, MortgageParams, MortgageResult, BankOffer } from "@/hooks/useMortgageCalculator";
import { toast } from "sonner";


const NATIONALITIES = [
  { code: "AE", name: "UAE National" },
  { code: "PK", name: "Pakistan" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
];

export default function MortgageCalculator() {
  const { calculate, result, isCalculating, reset } = useMortgageCalculator();

  const { formatPrice } = useCurrency();
  const [propertyValue, setPropertyValue] = useState(2000000);
  const [nationality, setNationality] = useState("PK");
  const [residency, setResidency] = useState("non_resident");
  const [employment, setEmployment] = useState("salaried");
  const [income, setIncome] = useState(30000);
  const [age, setAge] = useState(35);
  const [downPct, setDownPct] = useState(20);

  const handleCalculate = async () => {
    try {
      await calculate({
        property_value: propertyValue,
        nationality,
        residency_status: residency,
        employment_type: employment,
        monthly_income: income,
        age,
        down_payment_pct: downPct,
      });
    } catch {
      toast.error("Calculation failed");
    }
  };

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mortgage Calculator</h1>
          <p className="text-muted-foreground">Cross-border mortgage modeling with UAE bank comparison and visa eligibility</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Form */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-lg">Buyer Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Property Value (AED)</Label>
                <div className="mt-2">
                  <Slider value={[propertyValue]} onValueChange={([v]) => setPropertyValue(v)} min={500000} max={20000000} step={100000} />
                  <p className="text-sm font-medium mt-1">{formatPrice(propertyValue)}</p>
                </div>
              </div>
              <div>
                <Label>Nationality</Label>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NATIONALITIES.map((n) => <SelectItem key={n.code} value={n.code}>{n.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Residency Status</Label>
                <Select value={residency} onValueChange={setResidency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uae_resident">UAE Resident</SelectItem>
                    <SelectItem value="non_resident">Non-Resident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employment</Label>
                <Select value={employment} onValueChange={setEmployment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaried">Salaried</SelectItem>
                    <SelectItem value="self_employed">Self-Employed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monthly Income (AED)</Label>
                <Input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} />
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min={21} max={70} />
              </div>
              <div>
                <Label>Down Payment (%)</Label>
                <Slider value={[downPct]} onValueChange={([v]) => setDownPct(v)} min={10} max={50} step={5} />
                <p className="text-sm mt-1">{downPct}% = {formatPrice(Math.round(propertyValue * downPct / 100))}</p>
              </div>
              <Button onClick={handleCalculate} disabled={isCalculating} className="w-full">
                {isCalculating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calculating...</> : <><Calculator className="h-4 w-4 mr-2" />Calculate Mortgage</>}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-4">
            {!result ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Enter buyer details and click Calculate to see mortgage options</CardContent></Card>
            ) : (
              <>
                {/* Financing Summary */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5" />Financing Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="bg-blue-50 p-3 rounded text-center">
                        <div className="text-xs text-muted-foreground">Down Payment</div>
                        <div className="font-bold">{formatPrice(result.financing.down_payment_aed)}</div>
                        <div className="text-xs">{result.financing.down_payment_pct}%</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded text-center">
                        <div className="text-xs text-muted-foreground">Loan Amount</div>
                        <div className="font-bold">{formatPrice(result.financing.loan_amount_aed)}</div>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded text-center">
                        <div className="text-xs text-muted-foreground">DLD Fee (4%)</div>
                        <div className="font-bold">{formatPrice(result.financing.dld_fee_aed)}</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded text-center">
                        <div className="text-xs text-muted-foreground">Total Upfront</div>
                        <div className="font-bold">{formatPrice(result.financing.total_upfront_aed)}</div>
                      </div>
                    </div>
                    {result.financing.min_down_note && (
                      <p className="text-xs text-amber-600 mt-2">{result.financing.min_down_note}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Offers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Bank Offers ({result.eligible_offers} of {result.bank_offers.length} eligible)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {result.bank_offers.map((b: BankOffer, i: number) => (
                        <Card key={i} className={`border-l-4 ${b.eligible ? "border-l-green-500" : "border-l-gray-300 opacity-60"}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">{b.bank}</p>
                                <p className="text-xs text-muted-foreground">{b.notes}</p>
                              </div>
                              {b.eligible ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-400" />}
                            </div>
                            {b.eligible ? (
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span>Fixed Rate</span><span className="font-bold">{b.fixed_rate}% ({b.fixed_period_years}yr)</span></div>
                                <div className="flex justify-between"><span>Variable</span><span>{b.variable_rate}%</span></div>
                                <div className="flex justify-between"><span>Tenure</span><span>{b.tenure_years} years</span></div>
                                <div className="flex justify-between border-t pt-1 mt-1"><span className="font-medium">Monthly EMI</span><span className="font-bold text-blue-600">{formatPrice(b.monthly_emi_aed)}</span></div>
                                <div className="flex justify-between text-xs text-muted-foreground"><span>Total Interest</span><span>{formatPrice(b.total_interest_aed)}</span></div>
                              </div>
                            ) : (
                              <p className="text-xs text-red-500">{b.ineligibility_reason}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Cross-Border */}
                {result.cross_border && (
                  <Card className="border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-purple-700"><Globe className="h-5 w-5" />Cross-Border Analysis ({result.cross_border.currency})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="bg-purple-50 p-3 rounded text-center">
                          <div className="text-xs text-muted-foreground">Property Value</div>
                          <div className="font-bold">{result.cross_border.currency} {result.cross_border.property_value.toLocaleString()}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded text-center">
                          <div className="text-xs text-muted-foreground">Down Payment</div>
                          <div className="font-bold">{result.cross_border.currency} {result.cross_border.down_payment.toLocaleString()}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded text-center">
                          <div className="text-xs text-muted-foreground">Monthly EMI</div>
                          <div className="font-bold">{result.cross_border.currency} {result.cross_border.monthly_emi.toLocaleString()}</div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{result.cross_border.rate_note}</p>
                      <p className="text-xs text-purple-600 mt-1">{result.cross_border.home_financing_note}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Golden Visa */}
                <Card className={result.golden_visa.eligible ? "border-amber-200 bg-amber-50/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Award className={`h-8 w-8 ${result.golden_visa.eligible ? "text-amber-500" : "text-gray-400"}`} />
                      <div>
                        <p className="font-medium">{result.golden_visa.eligible ? result.golden_visa.type : "Visa Eligibility"}</p>
                        {result.golden_visa.eligible && result.golden_visa.benefits ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.golden_visa.benefits.map((b: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs bg-amber-50 text-amber-700">{b}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{result.golden_visa.note}</p>
                        )}
                      </div>
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
