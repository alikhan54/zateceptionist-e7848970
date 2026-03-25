import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Heart, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const N8N_WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

interface Suggestion {
  approach: "empathetic" | "solution" | "concise";
  message: string;
  action?: string | null;
}

interface SuggestedResponsesProps {
  conversationId: string;
  tenantId: string;
  onSelectSuggestion: (text: string) => void;
}

const APPROACH_CONFIG = {
  empathetic: { icon: Heart, label: "Empathetic", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40" },
  solution: { icon: Target, label: "Solution", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40" },
  concise: { icon: Zap, label: "Concise", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40" },
};

export function SuggestedResponses({ conversationId, tenantId, onSelectSuggestion }: SuggestedResponsesProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!conversationId || !tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${N8N_WEBHOOK_BASE}/comm-suggest-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, tenant_id: tenantId }),
      });
      const data = await response.json();
      if (data.success && data.suggestions?.length) {
        setSuggestions(data.suggestions.slice(0, 3));
        setExpanded(true);
      } else {
        setError("Could not generate suggestions");
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [conversationId, tenantId]);

  const handleSelect = (suggestion: Suggestion) => {
    onSelectSuggestion(suggestion.message);
    setExpanded(false);
  };

  return (
    <div className="px-4 pt-2">
      {/* Toggle bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (!expanded && suggestions.length === 0) {
              fetchSuggestions();
            } else {
              setExpanded(!expanded);
            }
          }}
          disabled={loading}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Suggestions
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
        {expanded && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={fetchSuggestions}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            {loading ? "Generating..." : "Regenerate"}
          </Button>
        )}
      </div>

      {/* Suggestions */}
      {expanded && (
        <div className="mt-2 space-y-1.5 pb-1">
          {loading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Generating AI suggestions...
            </div>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          {suggestions.map((s, i) => {
            const config = APPROACH_CONFIG[s.approach] || APPROACH_CONFIG.concise;
            const Icon = config.icon;
            return (
              <button
                key={i}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2 transition-colors cursor-pointer",
                  config.bg,
                )}
                onClick={() => handleSelect(s)}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={cn("h-3 w-3", config.color)} />
                  <span className={cn("text-[10px] font-medium uppercase tracking-wider", config.color)}>
                    {config.label}
                  </span>
                  {s.action && (
                    <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded ml-auto">
                      {s.action.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed">{s.message}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
