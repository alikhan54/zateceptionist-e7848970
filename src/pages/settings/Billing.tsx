import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBilling, PLANS } from '@/hooks/useBilling';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, Check, Loader2, ExternalLink, Receipt, 
  AlertCircle, Crown, Zap, Building2, Rocket,
  Users, Database, Mic, Clock
} from 'lucide-react';

export default function BillingSettings() {
  const { 
    subscription, 
    billingHistory, 
    isLoading, 
    currentPlan, 
    plans,
    createCheckoutSession,
    createCustomerPortal,
  } = useBilling();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Handle success/cancel from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: 'Payment successful!', description: 'Your subscription has been updated.' });
    }
    if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Payment canceled', variant: 'destructive' });
    }
  }, [searchParams, toast]);

  const handleUpgrade = async (planId: string) => {
    setUpgradingPlan(planId);
    try {
      await createCheckoutSession.mutateAsync(planId);
    } catch (error) {
      toast({ title: 'Failed to start checkout', variant: 'destructive' });
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      await createCustomerPortal.mutateAsync();
    } catch (error) {
      toast({ title: 'Coming soon', description: 'Billing portal will be available soon.' });
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Zap className="h-5 w-5" />;
      case 'professional': return <Rocket className="h-5 w-5" />;
      case 'enterprise': return <Crown className="h-5 w-5" />;
      default: return <Building2 className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan Card */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {getPlanIcon(currentPlan.id)}
              </div>
              <div>
                <CardTitle>Current Plan: {currentPlan.name}</CardTitle>
                <CardDescription>
                  {subscription?.status === 'trialing' 
                    ? `Trial ends ${subscription.trial_end ? new Date(subscription.trial_end).toLocaleDateString() : 'soon'}`
                    : subscription?.current_period_end 
                      ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                      : currentPlan.description
                  }
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">${currentPlan.price}</p>
              <p className="text-sm text-muted-foreground">/month</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Team Members</span>
              </div>
              <p className="font-semibold">
                {subscription?.features?.users === -1 ? 'Unlimited' : `${subscription?.features?.users || currentPlan.limits.users}`}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs">API Calls</span>
              </div>
              <p className="font-semibold">
                {subscription?.features?.api_calls === -1 ? 'Unlimited' : `${(subscription?.features?.api_calls || currentPlan.limits.api_calls).toLocaleString()}/mo`}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Database className="h-4 w-4" />
                <span className="text-xs">Storage</span>
              </div>
              <p className="font-semibold">{subscription?.features?.storage_gb || currentPlan.limits.storage_gb} GB</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Mic className="h-4 w-4" />
                <span className="text-xs">Voice Minutes</span>
              </div>
              <p className="font-semibold">{subscription?.features?.voice_minutes || currentPlan.limits.voice_minutes}/mo</p>
            </div>
          </div>
        </CardContent>
        {subscription?.stripe_subscription_id && (
          <CardFooter>
            <Button variant="outline" onClick={handleManageBilling}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan.id;
            const isUpgrade = plans.indexOf(plan) > plans.indexOf(currentPlan);
            
            return (
              <Card key={plan.id} className={isCurrentPlan ? 'border-primary ring-1 ring-primary' : ''}>
                {isCurrentPlan && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Current Plan</Badge>
                )}
                {plan.id === 'professional' && !isCurrentPlan && (
                  <Badge variant="secondary" className="absolute -top-2 left-1/2 -translate-x-1/2">Most Popular</Badge>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    {getPlanIcon(plan.id)}
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant={isUpgrade ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgradingPlan === plan.id}
                    >
                      {upgradingPlan === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isUpgrade ? 'Upgrade' : 'Switch'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

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
          {subscription?.stripe_customer_id ? (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• ••••</p>
                  <p className="text-sm text-muted-foreground">Managed via Stripe</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageBilling}>
                Update
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No payment method on file</p>
              <p className="text-sm">Add a payment method when you upgrade your plan</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No billing history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {billingHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {item.status === 'paid' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-medium">${(item.amount / 100).toFixed(2)}</p>
                      <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                    {item.receipt_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={item.receipt_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
