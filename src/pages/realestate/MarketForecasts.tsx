import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, BarChart3, LineChart } from "lucide-react";
import { RTLWrapper } from "@/components/realestate/RTLWrapper";
import { useMarketForecasts, MarketForecast } from "@/hooks/useMarketForecasts";

const formatAED = (n: number) => `AED ${Math.round(n).toLocaleString()}`;

const trendIcon = (dir: string) => {
  if (dir === "strong_up" || dir === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (dir === "strong_down" || dir === "down") return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
};

const recColors: Record<string, string> = {
  strong_buy: "bg-green-600 text-white", buy: "bg-green-100 text-green-800",
  hold: "bg-yellow-100 text-yellow-800", wait: "bg-orange-100 text-orange-800",
  avoid: "bg-red-100 text-red-800",
};

export default function MarketForecasts() {
  const { forecasts, isLoading, locations, getForLocation } = useMarketForecasts();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const displayed = selectedLocation === "all" ? forecasts : getForLocation(selectedLocation);
  const latestByLocation = new Map<string, MarketForecast>();
  forecasts.forEach((f) => {
    if (!latestByLocation.has(f.location) || f.forecast_date > (latestByLocation.get(f.location)?.forecast_date || "")) {
      latestByLocation.set(f.location, f);
    }
  });

  return (
    <RTLWrapper>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Forecasts</h1>
          <p className="text-muted-foreground">AI-powered 3/6/12 month price predictions with investment recommendations</p>
        </div>

        {/* Location Selector */}
        <div className="flex gap-4">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-64"><SelectValue placeholder="All Locations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading forecasts...</div>
        ) : displayed.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No forecasts available yet. The Market Forecaster runs daily at 6 AM and generates predictions for all active listing locations.</CardContent></Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {selectedLocation === "all" && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from(latestByLocation.entries()).map(([loc, f]) => (
                  <Card key={loc} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedLocation(loc)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium">{loc}</p>
                          <p className="text-xs text-muted-foreground">{f.property_type} • {f.metric.replace(/_/g, " ")}</p>
                        </div>
                        {trendIcon(f.trend_direction)}
                      </div>
                      <div className="text-lg font-bold">{formatAED(f.current_value)}/sqft</div>
                      <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="text-center">
                          <div className={f.forecast_3m_change_pct >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {f.forecast_3m_change_pct >= 0 ? "+" : ""}{f.forecast_3m_change_pct}%
                          </div>
                          <div className="text-muted-foreground">3 months</div>
                        </div>
                        <div className="text-center">
                          <div className={f.forecast_6m_change_pct >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {f.forecast_6m_change_pct >= 0 ? "+" : ""}{f.forecast_6m_change_pct}%
                          </div>
                          <div className="text-muted-foreground">6 months</div>
                        </div>
                        <div className="text-center">
                          <div className={f.forecast_12m_change_pct >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {f.forecast_12m_change_pct >= 0 ? "+" : ""}{f.forecast_12m_change_pct}%
                          </div>
                          <div className="text-muted-foreground">12 months</div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <Badge className={recColors[f.investment_recommendation] || ""}>{(f.investment_recommendation || "hold").replace(/_/g, " ")}</Badge>
                        <span className="text-xs text-muted-foreground">{f.confidence_score}% confidence</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Detailed View */}
            {selectedLocation !== "all" && displayed.length > 0 && (
              <>
                {displayed.map((f) => (
                  <Card key={f.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{f.location} — {f.property_type}</CardTitle>
                          <p className="text-sm text-muted-foreground">{f.metric.replace(/_/g, " ")} • Forecast: {new Date(f.forecast_date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {trendIcon(f.trend_direction)}
                          <Badge className={recColors[f.investment_recommendation] || ""}>{(f.investment_recommendation || "hold").replace(/_/g, " ")}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="bg-muted/50 p-3 rounded text-center">
                          <div className="text-xs text-muted-foreground">Current</div>
                          <div className="font-bold">{formatAED(f.current_value)}</div>
                        </div>
                        <div className={`p-3 rounded text-center ${f.forecast_3m_change_pct >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                          <div className="text-xs text-muted-foreground">3 Months</div>
                          <div className="font-bold">{formatAED(f.forecast_3m)}</div>
                          <div className={`text-xs ${f.forecast_3m_change_pct >= 0 ? "text-green-600" : "text-red-600"}`}>{f.forecast_3m_change_pct >= 0 ? "+" : ""}{f.forecast_3m_change_pct}%</div>
                        </div>
                        <div className={`p-3 rounded text-center ${f.forecast_6m_change_pct >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                          <div className="text-xs text-muted-foreground">6 Months</div>
                          <div className="font-bold">{formatAED(f.forecast_6m)}</div>
                          <div className={`text-xs ${f.forecast_6m_change_pct >= 0 ? "text-green-600" : "text-red-600"}`}>{f.forecast_6m_change_pct >= 0 ? "+" : ""}{f.forecast_6m_change_pct}%</div>
                        </div>
                        <div className={`p-3 rounded text-center ${f.forecast_12m_change_pct >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                          <div className="text-xs text-muted-foreground">12 Months</div>
                          <div className="font-bold">{formatAED(f.forecast_12m)}</div>
                          <div className={`text-xs ${f.forecast_12m_change_pct >= 0 ? "text-green-600" : "text-red-600"}`}>{f.forecast_12m_change_pct >= 0 ? "+" : ""}{f.forecast_12m_change_pct}%</div>
                        </div>
                      </div>
                      {f.ai_narrative && (
                        <div className="bg-blue-50 p-3 rounded">
                          <h4 className="text-sm font-medium mb-1 flex items-center gap-1"><LineChart className="h-3 w-3" />AI Market Analysis</h4>
                          <p className="text-sm">{f.ai_narrative}</p>
                        </div>
                      )}
                      {(f.risk_factors || []).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" />Risk Factors</h4>
                          <div className="flex flex-wrap gap-1">
                            {f.risk_factors.map((r, i) => <Badge key={i} variant="outline" className="text-xs text-amber-700 border-amber-200">{r}</Badge>)}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Based on {f.data_points_used} data points • Model: {f.model_used} • {f.confidence_score}% confidence</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </RTLWrapper>
  );
}
