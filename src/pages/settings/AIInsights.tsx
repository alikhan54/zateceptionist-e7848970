import React from "react";
import { Sparkles, ArrowRight, X, TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIRecommendation } from "./types/team.types";

interface AIInsightsProps {
  recommendations: AIRecommendation[];
  onApply: (recommendation: AIRecommendation) => Promise<{ success: boolean }>;
  onDismiss: (recommendation: AIRecommendation) => Promise<{ success: boolean }>;
}

export function AIInsights({ recommendations, onApply, onDismiss }: AIInsightsProps) {
  if (recommendations.length === 0) return null;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "medium":
        return <TrendingUp className="w-4 h-4 text-amber-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-500/20 bg-red-500/5";
      case "medium":
        return "border-amber-500/20 bg-amber-500/5";
      default:
        return "border-blue-500/20 bg-blue-500/5";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">AI Insights</h3>
        <span className="text-sm text-muted-foreground">({recommendations.length} suggestions)</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-4 border rounded-lg ${getPriorityColor(rec.priority)} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              {getPriorityIcon(rec.priority)}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{rec.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={() => onApply(rec)}
              >
                Apply
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(rec)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIInsights;
