// ============================================================================
// AIForecast.tsx — AI Prediction Component for Forecast Page
// Queries ai_predictions and forecast_history from Supabase
// Shows real predictions with confidence scores — NEVER fake data
// ============================================================================

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Brain,
  BarChart3,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Prediction {
  id: string;
  prediction_type: string;
  entity_type: string;
  predicted_outcome: string;
  predicted_value: number | null;
  confidence: number;
  valid_until: string | null;
  was_accurate: boolean | null;
  accuracy_score: number | null;
  created_at: string;
}

interface ForecastEntry {
  id: string;
  forecast_date: string;
  period: string;
  predicted_revenue: number | null;
  actual_revenue: number | null;
  predicted_deals: number | null;
  actual_deals: number | null;
  confidence_score: number | null;
  model_version: string | null;
  created_at: string;
}

export default function AIForecast() {
  const { tenantId } = useTenant();

  // Fetch AI predictions
  const { data: predictions, isLoading: loadingPredictions } = useQuery({
    queryKey: ["ai-predictions", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_predictions")
        .select("id, prediction_type, entity_type, predicted_outcome, predicted_value, confidence, valid_until, was_accurate, accuracy_score, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as Prediction[]) || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch forecast history
  const { data: forecasts, isLoading: loadingForecasts } = useQuery({
    queryKey: ["forecast-history", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("forecast_history")
        .select("id, forecast_date, period, predicted_revenue, actual_revenue, predicted_deals, actual_deals, confidence_score, model_version, created_at")
        .eq("tenant_id", tenantId)
        .order("forecast_date", { ascending: false })
        .limit(12);
      return (data as ForecastEntry[]) || [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate accuracy stats
  const accuracyStats = useMemo(() => {
    if (!predictions || predictions.length === 0) return null;
    const evaluated = predictions.filter((p) => p.was_accurate !== null);
    if (evaluated.length === 0) return null;
    const accurate = evaluated.filter((p) => p.was_accurate === true).length;
    const avgAccuracy = evaluated.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / evaluated.length;
    return {
      total: predictions.length,
      evaluated: evaluated.length,
      accurate,
      rate: evaluated.length > 0 ? (accurate / evaluated.length) * 100 : 0,
      avgScore: avgAccuracy,
    };
  }, [predictions]);

  // Active predictions (not yet expired)
  const activePredictions = useMemo(() => {
    if (!predictions) return [];
    return predictions.filter((p) => {
      if (!p.valid_until) return true;
      return new Date(p.valid_until) > new Date();
    }).slice(0, 5);
  }, [predictions]);

  // Forecast comparison (predicted vs actual)
  const forecastComparisons = useMemo(() => {
    if (!forecasts) return [];
    return forecasts
      .filter((f) => f.actual_revenue !== null || f.actual_deals !== null)
      .slice(0, 6);
  }, [forecasts]);

  const isLoading = loadingPredictions || loadingForecasts;
  const hasData = (predictions && predictions.length > 0) || (forecasts && forecasts.length > 0);

  if (isLoading) {
    return (
      <Card className="border-indigo-200">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 text-indigo-300 animate-pulse" />
          <p className="text-sm">Loading AI predictions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="border-dashed border-indigo-200 bg-indigo-50/30">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-8 w-8 mx-auto mb-2 text-indigo-300" />
          <p className="text-sm font-medium">AI Forecasts</p>
          <p className="text-xs mt-1">Predictions will appear after 2+ weeks of deal activity.</p>
          <p className="text-xs mt-0.5">The AI learns from your pipeline patterns to make better forecasts over time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/30 to-purple-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-indigo-500" />
          AI Predictions
          {accuracyStats && accuracyStats.evaluated > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {accuracyStats.rate.toFixed(0)}% accuracy ({accuracyStats.evaluated} evaluated)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Accuracy Overview */}
        {accuracyStats && accuracyStats.evaluated > 0 && (
          <div className="flex items-center gap-4 p-3 bg-white/60 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Prediction Accuracy</span>
                <span className="text-xs font-medium">{accuracyStats.rate.toFixed(1)}%</span>
              </div>
              <Progress value={accuracyStats.rate} className="h-2" />
            </div>
            <div className="text-center px-3 border-l">
              <span className="text-lg font-bold text-indigo-600">{accuracyStats.total}</span>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
            <div className="text-center px-3 border-l">
              <span className="text-lg font-bold text-green-600">{accuracyStats.accurate}</span>
              <p className="text-[10px] text-muted-foreground">Correct</p>
            </div>
          </div>
        )}

        {/* Active Predictions */}
        {activePredictions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-indigo-600 mb-2 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Active Predictions
            </h4>
            <div className="space-y-2">
              {activePredictions.map((pred) => (
                <div key={pred.id} className="flex items-center gap-3 p-2.5 bg-white/60 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {pred.predicted_outcome || pred.prediction_type}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          pred.confidence >= 0.8
                            ? "border-green-300 text-green-700"
                            : pred.confidence >= 0.5
                            ? "border-amber-300 text-amber-700"
                            : "border-gray-300 text-gray-600"
                        }`}
                      >
                        {(pred.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pred.entity_type} &middot; {pred.prediction_type}
                      {pred.predicted_value ? ` &middot; $${pred.predicted_value.toLocaleString()}` : ""}
                    </p>
                  </div>
                  {pred.was_accurate !== null && (
                    <div>
                      {pred.was_accurate ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecast History Comparisons */}
        {forecastComparisons.length > 0 && (
          <div className="mt-4 pt-3 border-t border-indigo-100">
            <h4 className="text-xs font-medium text-indigo-600 mb-2 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Forecast vs Actual
            </h4>
            <div className="space-y-2">
              {forecastComparisons.map((fc) => {
                const predicted = fc.predicted_revenue || 0;
                const actual = fc.actual_revenue || 0;
                const diff = predicted > 0 ? ((actual - predicted) / predicted) * 100 : 0;
                const isOver = diff > 0;
                return (
                  <div key={fc.id} className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground w-20 truncate">
                      {new Date(fc.forecast_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                    </span>
                    <span className="text-muted-foreground w-24">
                      Predicted: ${predicted.toLocaleString()}
                    </span>
                    <span className="font-medium w-20">
                      Actual: ${actual.toLocaleString()}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${isOver ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}`}
                    >
                      {isOver ? "+" : ""}
                      {diff.toFixed(1)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
