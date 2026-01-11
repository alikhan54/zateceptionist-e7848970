// src/pages/settings/BillingSettings.tsx
// COMPLETE BILLING PAGE WITH YOUR PRICING TIERS
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSubscription, SUBSCRIPTION_TIERS, SubscriptionTier } from "@/contexts/SubscriptionContext";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  Receipt,
  AlertCircle,
  Crown,
  Zap,
  Building2,
  Rocket,
  Users,
  Database,
  Mic,
  Clock,
  Globe,
  Mail,
  Lock,
  Sparkles,
  TrendingUp,
  X,
  Phone,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BillingSettings() {
  const { tier, tierConfig, limits, usage, allTiers, refreshUsage, isLoadingUsage } = useSubscription();
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Handle success/cancel from payment
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Payment successful!", description: "Your subscription has been updated." });
      refreshUsage();
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Payment canceled", variant: "destructive" });
    }
  }, [searchParams, toast, refreshUsage]);

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "starter":
        return <Zap className="h-6 w-6" />;
      case "professional":
        return <Rocket className="h-6 w-6" />;
      case "enterprise":
        return <Crown className="h-6 w-6" />;
      default:
        return <Building2 className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case "starter":
        return "from-blue-500 to-blue-600";
      case "professional":
        return "from-purple-500 to-purple-600";
      case "enterprise":
        return "from-amber-500 to-amber-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const handleUpgrade = async (planId: SubscriptionTier) => {
    if (planId === tier) return;

    setUpgradingPlan(planId);

    try {
      // For now, just update the tenant_config
      // In production, this would redirect to Stripe checkout
      const { error } = await supabase
        .from("tenant_config")
        .update({ subscription_tier: planId })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "Plan updated!",
        description: `You're now on the ${SUBSCRIPTION_TIERS[planId].name} plan.`,
      });

      // Refresh the page to reload subscription context
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Upgrade failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpgradingPlan(null);
    }
  };

  const getYearlySavings = (planId: SubscriptionTier) => {
    const plan = SUBSCRIPTION_TIERS[planId];
    const monthlyCost = plan.price * 12;
    const yearlyCost = plan.yearlyPrice;
    return monthlyCost - yearlyCost;
  };

  if (isLoadingUsage) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription, usage, and payment methods</p>
      </div>

      {/* Current Plan Card */}
      <Card className="overflow-hidden">
        <div className={cn("h-2 bg-gradient-to-r", getPlanColor(tier))} />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-xl bg-gradient-to-br text-white", getPlanColor(tier))}>
                {getPlanIcon(tier)}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {tierConfig.name} Plan
                  {tierConfig.badge && (
                    <Badge className="ml-2" variant="secondary">
                      {tierConfig.badge}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{tierConfig.description}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">${tierConfig.price}</p>
              <p className="text-sm text-muted-foreground">/month</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Usage Overview */}
          {usage && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Leads</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{usage.leads_generated}</p>
                <Progress value={(usage.leads_generated / usage.leads_limit) * 100} className="h-1.5" />
                <p className="text-xs text-muted-foreground">of {usage.leads_limit}/month</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Emails</span>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{usage.emails_sent_today}</p>
                <Progress value={(usage.emails_sent_today / usage.emails_limit) * 100} className="h-1.5" />
                <p className="text-xs text-muted-foreground">of {usage.emails_limit}/day</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">WhatsApp</span>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{usage.whatsapp_sent_today}</p>
                <Progress value={(usage.whatsapp_sent_today / usage.whatsapp_limit) * 100} className="h-1.5" />
                <p className="text-xs text-muted-foreground">of {usage.whatsapp_limit}/day</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Voice</span>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{limits.voice_minutes}</p>
                <p className="text-xs text-muted-foreground">minutes/month</p>
              </div>
            </div>
          )}

          {/* Data Sources */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Data Sources</h4>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="default"
                className={cn(limits.has_google_search ? "bg-blue-100 text-blue-700 border-blue-200" : "opacity-50")}
              >
                {limits.has_google_search ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                Google Search
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  limits.has_hunter_access ? "bg-orange-100 text-orange-700 border-orange-200" : "opacity-50",
                )}
              >
                {limits.has_hunter_access ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                Hunter.io
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  limits.has_apollo_access ? "bg-purple-100 text-purple-700 border-purple-200" : "opacity-50",
                )}
              >
                {limits.has_apollo_access ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                Apollo
              </Badge>
              <Badge
                variant="outline"
                className={cn(limits.has_apify_access ? "bg-green-100 text-green-700 border-green-200" : "opacity-50")}
              >
                {limits.has_apify_access ? <Check className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                Apify
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Choose Your Plan</h2>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={billingCycle === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">
                Save 17%
              </Badge>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {allTiers.map((plan) => {
            const isCurrentPlan = plan.id === tier;
            const isUpgrade = allTiers.indexOf(plan) > allTiers.findIndex((p) => p.id === tier);
            const price = billingCycle === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.price;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-all",
                  isCurrentPlan && "ring-2 ring-primary",
                  plan.id === "professional" && "md:scale-105 shadow-lg",
                )}
              >
                {/* Badge */}
                {plan.badge && !isCurrentPlan && <Badge className="absolute top-4 right-4">{plan.badge}</Badge>}
                {isCurrentPlan && (
                  <Badge className="absolute top-4 right-4" variant="default">
                    Current Plan
                  </Badge>
                )}

                <div className={cn("h-1 bg-gradient-to-r", getPlanColor(plan.id))} />

                <CardHeader className="pb-4">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white mb-3",
                      getPlanColor(plan.id),
                    )}
                  >
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-4xl font-bold">${price}</span>
                    <span className="text-muted-foreground">/month</span>
                    {billingCycle === "yearly" && (
                      <p className="text-sm text-green-600 mt-1">Save ${getYearlySavings(plan.id)}/year</p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pb-4">
                  {/* Key Limits */}
                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Leads/month</p>
                      <p className="font-semibold">{plan.limits.leads_per_month.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Emails/day</p>
                      <p className="font-semibold">{plan.limits.emails_per_day.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">WhatsApp/day</p>
                      <p className="font-semibold">{plan.limits.whatsapp_per_day.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Team Members</p>
                      <p className="font-semibold">
                        {plan.limits.max_users === -1 ? "Unlimited" : plan.limits.max_users}
                      </p>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2">
                    {plan.features.slice(0, 8).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 8 && (
                      <li className="text-sm text-muted-foreground pl-6">+{plan.features.length - 8} more features</li>
                    )}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className={cn("w-full", isUpgrade && "bg-gradient-to-r " + getPlanColor(plan.id))}
                      variant={isUpgrade ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgradingPlan === plan.id}
                    >
                      {upgradingPlan === plan.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {isUpgrade ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>See what's included in each plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  {allTiers.map((plan) => (
                    <th key={plan.id} className="text-center py-3 px-4 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { label: "Leads per month", key: "leads_per_month", format: (v: number) => v.toLocaleString() },
                  {
                    label: "B2B searches per day",
                    key: "b2b_searches_per_day",
                    format: (v: number) => v.toLocaleString(),
                  },
                  {
                    label: "Google Search",
                    key: "has_google_search",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                  {
                    label: "Hunter.io",
                    key: "has_hunter_access",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                  {
                    label: "Apollo.io",
                    key: "has_apollo_access",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                  {
                    label: "Apify Scraping",
                    key: "has_apify_access",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                  {
                    label: "Intent Detection",
                    key: "has_intent_leads",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                  { label: "Emails per day", key: "emails_per_day", format: (v: number) => v.toLocaleString() },
                  { label: "WhatsApp per day", key: "whatsapp_per_day", format: (v: number) => v.toLocaleString() },
                  { label: "Voice calls per day", key: "calls_per_day", format: (v: number) => v.toLocaleString() },
                  { label: "Active sequences", key: "active_sequences", format: (v: number) => v.toLocaleString() },
                  { label: "Team members", key: "max_users", format: (v: number) => (v === -1 ? "Unlimited" : v) },
                  { label: "Voice minutes", key: "voice_minutes", format: (v: number) => v.toLocaleString() },
                  {
                    label: "White-label",
                    key: "has_white_label",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                  {
                    label: "API Access",
                    key: "has_api_access",
                    format: (v: boolean) =>
                      v ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mx-auto" />
                      ),
                  },
                ].map((row) => (
                  <tr key={row.key}>
                    <td className="py-3 px-4">{row.label}</td>
                    {allTiers.map((plan) => (
                      <td key={plan.id} className="py-3 px-4 text-center">
                        {row.format((plan.limits as Record<string, any>)[row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Payment integration coming soon</p>
            <p className="text-sm mt-1">Contact us to upgrade your plan</p>
            <Button variant="outline" className="mt-4">
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
