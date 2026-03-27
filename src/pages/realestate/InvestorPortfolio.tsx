import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Home, Calendar, AlertTriangle } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useInvestorPortfolio } from "@/hooks/useInvestorPortfolio";

const formatAED = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

export default function InvestorPortfolio() {
  const { properties, isLoading, stats } = useInvestorPortfolio();

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investor Portfolio</h1>
          <p className="text-muted-foreground">Track property investments, ROI, rental income, and tax deadlines across countries</p>
        </div>

        {/* Portfolio Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : stats.propertyCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : formatAED(stats.totalCurrentValue)}</div></CardContent>
          </Card>
          <Card className={stats.totalGain >= 0 ? "" : "border-red-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total ROI</CardTitle>
              {stats.totalGain >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>{isLoading ? "..." : `${stats.totalROIPct}%`}</div>
              <p className="text-xs text-muted-foreground">{formatAED(stats.totalGain)} gain</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Rental</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{isLoading ? "..." : formatAED(stats.monthlyRental)}</div></CardContent>
          </Card>
        </div>

        {/* Properties */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading portfolio...</div>
        ) : properties.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No investment properties tracked yet. Properties are automatically added when deals close, or you can add them manually.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {properties.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{p.property_description || "Investment Property"}</p>
                      <p className="text-xs text-muted-foreground">Purchased: {new Date(p.purchase_date).toLocaleDateString()} • {formatAED(p.purchase_price_aed)}</p>
                    </div>
                    {p.is_rented && <Badge className="bg-green-100 text-green-800">Rented</Badge>}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/50 p-2 rounded">
                      <div className="text-muted-foreground">Current Value</div>
                      <div className="font-bold">{p.current_estimated_value_aed ? formatAED(p.current_estimated_value_aed) : "TBD"}</div>
                    </div>
                    <div className={`p-2 rounded ${(p.capital_gain_pct || 0) >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <div className="text-muted-foreground">Capital Gain</div>
                      <div className={`font-bold ${(p.capital_gain_pct || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{p.capital_gain_pct != null ? `${p.capital_gain_pct}%` : "—"}</div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <div className="text-muted-foreground">Net Yield</div>
                      <div className="font-bold text-blue-600">{p.net_yield_pct != null ? `${p.net_yield_pct}%` : "—"}</div>
                    </div>
                  </div>

                  {p.is_rented && p.monthly_rent_aed && (
                    <div className="text-sm"><span className="text-muted-foreground">Monthly rent:</span> {formatAED(p.monthly_rent_aed)}</div>
                  )}

                  {p.home_currency && p.current_value_home && (
                    <div className="bg-purple-50 p-2 rounded text-xs text-purple-700">
                      Home value: {p.home_currency} {p.current_value_home.toLocaleString()}
                    </div>
                  )}

                  {(p.tax_deadlines || []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Tax Deadlines</p>
                      {p.tax_deadlines.map((td, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{td.country}: {td.deadline} — {td.description}</p>
                      ))}
                    </div>
                  )}

                  {(p.alerts || []).filter((a) => !a.read).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.alerts.filter((a) => !a.read).map((a, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-amber-700">{a.message}</Badge>
                      ))}
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
