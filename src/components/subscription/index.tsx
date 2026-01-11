// src/components/subscription/index.tsx
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Crown, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function FeatureGate({
  feature,
  children,
  showUpgrade = true,
}: {
  feature: string;
  children: ReactNode;
  showUpgrade?: boolean;
}) {
  const navigate = useNavigate();
  const { limits } = useSubscription();
  const isLocked = !(limits as any)[feature];

  if (!isLocked) return <>{children}</>;
  if (!showUpgrade) return null;

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg border-2 border-dashed">
        <div className="text-center p-6">
          <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-3">Upgrade to access this feature</p>
          <Button size="sm" onClick={() => navigate("/settings/billing")}>
            <Crown className="h-4 w-4 mr-1" /> Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}

export function UsageMeter({
  type,
  label,
  showWarning = true,
}: {
  type: string;
  label: string;
  showWarning?: boolean;
}) {
  const { usage } = useSubscription();

  if (!usage) return null;

  const usageMap: Record<string, [number, number]> = {
    leads: [usage.leads_generated, usage.leads_limit],
    b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
    intent_searches: [usage.intent_searches_today, usage.intent_limit],
  };

  const [used, limit] = usageMap[type] || [0, 100];
  const percentage = limit > 0 ? (used / limit) * 100 : 0;
  const isAtLimit = percentage >= 100;
  const isNearLimit = percentage >= 80 && !isAtLimit;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium", isAtLimit && "text-red-500", isNearLimit && "text-yellow-500")}>
          {used} / {limit}
        </span>
      </div>
      <Progress value={Math.min(percentage, 100)} className={cn("h-2", isAtLimit && "[&>div]:bg-red-500")} />
      {showWarning && isAtLimit && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Limit reached
        </p>
      )}
    </div>
  );
}

export function DataSourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; color: string }> = {
    apollo: { label: "Apollo", color: "bg-purple-100 text-purple-700" },
    hunter: { label: "Hunter", color: "bg-orange-100 text-orange-700" },
    google: { label: "Google", color: "bg-blue-100 text-blue-700" },
    apify: { label: "Apify", color: "bg-green-100 text-green-700" },
    intent: { label: "Intent", color: "bg-yellow-100 text-yellow-700" },
  };
  const cfg = config[source] || config.google;
  return (
    <Badge variant="outline" className={cn("text-xs", cfg.color)}>
      {cfg.label}
    </Badge>
  );
}

export function DataSourceIndicator() {
  const navigate = useNavigate();
  const { limits, tier } = useSubscription();

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Data Sources</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-blue-100 text-blue-700">
          <Check className="h-3 w-3 mr-1" /> Google
        </Badge>
        <Badge variant="outline" className={limits.has_hunter_access ? "bg-orange-100 text-orange-700" : "opacity-50"}>
          {limits.has_hunter_access ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />} Hunter
        </Badge>
        <Badge variant="outline" className={limits.has_apollo_access ? "bg-purple-100 text-purple-700" : "opacity-50"}>
          {limits.has_apollo_access ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />} Apollo
        </Badge>
        <Badge variant="outline" className={limits.has_apify_access ? "bg-green-100 text-green-700" : "opacity-50"}>
          {limits.has_apify_access ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />} Apify
        </Badge>
      </div>
      {tier === "starter" && (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/settings/billing")}>
          Upgrade for premium sources →
        </Button>
      )}
    </div>
  );
}

export function TierBadge() {
  const { tier } = useSubscription();
  const names: Record<string, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
  };
  const colors: Record<string, string> = {
    starter: "bg-gray-100 text-gray-700",
    professional: "bg-blue-100 text-blue-700",
    enterprise: "bg-amber-100 text-amber-700",
  };
  return (
    <Badge variant="outline" className={cn("px-3 py-1", colors[tier])}>
      <Crown className="h-3 w-3 mr-1" /> {names[tier]}
    </Badge>
  );
}

export function LimitWarning({ type }: { type: string }) {
  const navigate = useNavigate();
  const { hasReachedLimit } = useSubscription();

  if (!hasReachedLimit(type)) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-700">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {type === "leads" ? "Monthly lead limit" : "Daily search limit"} reached
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={() => navigate("/settings/billing")}>
        Upgrade Now
      </Button>
    </div>
  );
}
