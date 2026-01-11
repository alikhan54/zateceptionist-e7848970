// src/components/subscription/index.tsx
// SUBSCRIPTION UI COMPONENTS
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscriptionContext, TierLimits, SubscriptionTier } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, Crown, AlertTriangle, Check, Globe, Mail, Database, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// =====================================================
// FEATURE GATE - Lock features by tier
// =====================================================
interface FeatureGateProps {
  feature: keyof TierLimits;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  className?: string;
}

function SubscriptionFeatureGate({ feature, children, fallback, showUpgrade = true, className }: FeatureGateProps) {
  const { canUseFeature, getUpgradeReason, getRequiredTierForFeature } = useSubscriptionContext();
  const navigate = useNavigate();

  const isLocked = !canUseFeature(feature);
  const requiredTier = getRequiredTierForFeature(feature);

  if (!isLocked) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (!showUpgrade) return null;

  return (
    <div className={cn("relative", className)}>
      <div className="opacity-50 pointer-events-none blur-[1px]">{children}</div>

      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
        <div className="text-center p-6 max-w-sm">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          <p className="text-sm text-muted-foreground mb-3">{getUpgradeReason(feature)}</p>

          {requiredTier && (
            <p className="text-xs text-muted-foreground mb-4">
              Available in {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} plan
            </p>
          )}

          <Button onClick={() => navigate("/settings/billing")} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Upgrade Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// USAGE METER - Show usage vs limit
// =====================================================
interface UsageMeterProps {
  type: "leads" | "b2b_searches" | "intent_searches" | "emails" | "whatsapp" | "calls";
  label: string;
  showWarning?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function UsageMeter({ type, label, showWarning = true, size = "md", className }: UsageMeterProps) {
  const { usage, getUsagePercentage, getRemainingCredits, hasReachedLimit } = useSubscriptionContext();

  if (!usage) return null;

  const percentage = getUsagePercentage(type);
  const remaining = getRemainingCredits(type);
  const isAtLimit = hasReachedLimit(type);
  const isNearLimit = percentage >= 80 && !isAtLimit;

  // Get used and limit values
  const getValues = (): [number, number] => {
    const map: Record<string, [number, number]> = {
      leads: [usage.leads_generated, usage.leads_limit],
      b2b_searches: [usage.b2b_searches_today, usage.b2b_limit],
      intent_searches: [usage.intent_searches_today, usage.intent_limit],
      emails: [usage.emails_sent_today, usage.emails_limit],
      whatsapp: [usage.whatsapp_sent_today, usage.whatsapp_limit],
      calls: [usage.calls_today, usage.calls_limit],
    };
    return map[type] || [0, 0];
  };

  const [used, limit] = getValues();

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn(sizeClasses[size], isAtLimit && "[&>div]:bg-destructive", isNearLimit && "[&>div]:bg-yellow-500")}
      />

      {showWarning && isNearLimit && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Approaching limit ({remaining} remaining)
        </p>
      )}

      {showWarning && isAtLimit && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Limit reached - upgrade for more
        </p>
      )}
    </div>
  );
}

// =====================================================
// DATA SOURCE BADGE - Show which API source
// =====================================================
interface DataSourceBadgeProps {
  source: "apollo" | "hunter" | "google" | "apify" | "intent" | string;
  size?: "sm" | "md";
}

function DataSourceBadge({ source, size = "sm" }: DataSourceBadgeProps) {
  const config: Record<string, { label: string; color: string; icon: ReactNode }> = {
    apollo: {
      label: "Apollo",
      color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
      icon: <Crown className="h-3 w-3" />,
    },
    hunter: {
      label: "Hunter",
      color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
      icon: <Mail className="h-3 w-3" />,
    },
    google: {
      label: "Google",
      color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
      icon: <Globe className="h-3 w-3" />,
    },
    apify: {
      label: "Apify",
      color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
      icon: <Database className="h-3 w-3" />,
    },
    intent: {
      label: "Intent",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
      icon: <Zap className="h-3 w-3" />,
    },
  };

  const cfg = config[source] || config.google;

  return (
    <Badge variant="outline" className={cn("gap-1", cfg.color, size === "sm" ? "text-xs" : "text-sm")}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

// =====================================================
// DATA SOURCE INDICATOR - Show available sources
// =====================================================
interface DataSourceIndicatorProps {
  showLabels?: boolean;
}

function DataSourceIndicator({ showLabels = true }: DataSourceIndicatorProps) {
  const { canUseFeature, tier } = useSubscriptionContext();
  const navigate = useNavigate();

  const sources = [
    { key: "has_google_search", label: "Google", icon: Globe, color: "blue" },
    { key: "has_hunter_access", label: "Hunter", icon: Mail, color: "orange" },
    { key: "has_apollo_access", label: "Apollo", icon: Crown, color: "purple" },
    { key: "has_apify_access", label: "Apify", icon: Database, color: "green" },
  ] as const;

  return (
    <div className="space-y-2">
      {showLabels && <p className="text-sm font-medium">Data Sources</p>}

      <div className="flex flex-wrap gap-2">
        {sources.map(({ key, label, icon: Icon, color }) => {
          const isAvailable = canUseFeature(key as keyof TierLimits);

          return (
            <Badge
              key={key}
              variant={isAvailable ? "default" : "outline"}
              className={cn("gap-1 cursor-default", !isAvailable && "opacity-50 cursor-pointer")}
              onClick={!isAvailable ? () => navigate("/settings/billing") : undefined}
            >
              {isAvailable ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {label}
            </Badge>
          );
        })}
      </div>

      {tier === "starter" && (
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/settings/billing")}>
          Upgrade for premium data sources →
        </Button>
      )}
    </div>
  );
}

// =====================================================
// TIER BADGE - Show current tier
// =====================================================
interface TierBadgeProps {
  tier?: SubscriptionTier;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

function TierBadge({ tier: propTier, showIcon = true, size = "md" }: TierBadgeProps) {
  const { tier: currentTier, tierConfig } = useSubscriptionContext();
  const tier = propTier || currentTier;

  const colors: Record<SubscriptionTier, string> = {
    starter: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    professional: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
    enterprise: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const sizes = {
    sm: "text-xs px-1.5 py-0",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-3 py-1",
  };

  return (
    <Badge variant="outline" className={cn("gap-1", colors[tier], sizes[size])}>
      {showIcon && <Crown className="h-3 w-3" />}
      {tierConfig.name}
    </Badge>
  );
}

// =====================================================
// LIMIT WARNING ALERT
// =====================================================
interface LimitWarningProps {
  type: "leads" | "b2b_searches" | "intent_searches" | "emails" | "whatsapp" | "calls";
  className?: string;
}

function LimitWarning({ type, className }: LimitWarningProps) {
  const { hasReachedLimit, limits } = useSubscriptionContext();
  const navigate = useNavigate();

  if (!hasReachedLimit(type)) return null;

  const limitNames: Record<string, string> = {
    leads: `${limits.leads_per_month} leads`,
    b2b_searches: `${limits.b2b_searches_per_day} searches/day`,
    intent_searches: `${limits.intent_searches_per_day} searches/day`,
    emails: `${limits.emails_per_day} emails/day`,
    whatsapp: `${limits.whatsapp_per_day} messages/day`,
    calls: `${limits.calls_per_day} calls/day`,
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">Limit reached ({limitNames[type]})</span>
      </div>

      <Button size="sm" variant="destructive" onClick={() => navigate("/settings/billing")}>
        Upgrade Now
      </Button>
    </div>
  );
}

// Export all components
export { FeatureGate, UsageMeter, DataSourceBadge, DataSourceIndicator, TierBadge, LimitWarning };
