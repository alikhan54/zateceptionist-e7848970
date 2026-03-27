import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check, ArrowRight, ChevronLeft, Loader2,
  Shield, AlertCircle, Sparkles,
} from 'lucide-react';
import { OnboardingData } from '@/pages/onboarding/constants';
import { useTenant } from '@/contexts/TenantContext';
import { openCheckout } from '@/lib/paddle';
import { SUBSCRIPTION_TIERS, type SubscriptionTierId } from '@/lib/pricing';
import { useToast } from '@/hooks/use-toast';

interface PaymentStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const PLAN_ORDER: SubscriptionTierId[] = ['free_trial', 'starter', 'professional', 'enterprise'];

export default function PaymentStep({ data, updateData, onNext, onBack }: PaymentStepProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();

  const selectedPlan = (data.selectedPlan || 'professional') as string;

  const selectPlan = (planId: SubscriptionTierId) => {
    updateData({ selectedPlan: planId });
  };

  const handleSubscribe = async () => {
    // Free plan — skip payment
    if (selectedPlan === 'free_trial' || selectedPlan === 'free') {
      updateData({ selectedPlan: 'free', paymentVerified: true, trialStarted: true });
      onNext();
      return;
    }

    // Paid plan — open Paddle checkout overlay
    const email = (tenantConfig as any)?.email || (tenantConfig as any)?.company_email || '';
    if (!tenantId) {
      toast({ title: "Error", description: "Tenant not found. Please refresh.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await openCheckout(selectedPlan as SubscriptionTierId, tenantId, email);
      // Paddle overlay handles the rest — on success it redirects to /settings/billing?success=true
      // For onboarding flow, allow user to proceed after opening checkout
      updateData({ paymentVerified: true, trialStarted: true });
      onNext();
    } catch (err) {
      console.error('Paddle checkout error:', err);
      toast({
        title: "Payment setup failed",
        description: "You can continue with the free plan and upgrade later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeFallback = () => {
    updateData({ selectedPlan: 'free', paymentVerified: true, trialStarted: true });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-1">Start with a free trial. Upgrade anytime.</p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!isYearly ? 'font-medium' : 'text-muted-foreground'}`}>Monthly</span>
        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
        <span className={`text-sm ${isYearly ? 'font-medium' : 'text-muted-foreground'}`}>
          Yearly <Badge variant="secondary" className="ml-1 text-xs">Save 17%</Badge>
        </span>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLAN_ORDER.map((planId) => {
          const tier = SUBSCRIPTION_TIERS[planId];
          const isSelected = selectedPlan === planId;
          const price = isYearly ? Math.round(tier.price * 0.83) : tier.price;

          return (
            <Card
              key={planId}
              className={`cursor-pointer transition-all relative ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => selectPlan(planId)}
            >
              {tier.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${price}</span>
                  {price > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                </div>
                <CardDescription className="text-xs">
                  {tier.price === 0 ? tier.period : `${tier.period}ly billing`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {tier.features.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {tier.features.length > 6 && (
                    <li className="text-xs text-muted-foreground pl-5">
                      +{tier.features.length - 6} more features
                    </li>
                  )}
                </ul>
                {isSelected && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline" className="border-primary text-primary w-full justify-center">
                      <Check className="h-3 w-3 mr-1" /> Selected
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Paddle payment info for paid plans */}
      {selectedPlan !== 'free_trial' && selectedPlan !== 'free' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Secure payment powered by Paddle. You'll complete payment in a secure overlay after clicking Subscribe.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          {selectedPlan !== 'free_trial' && selectedPlan !== 'free' && (
            <Button variant="outline" onClick={handleFreeFallback}>
              Continue Free Instead
            </Button>
          )}
          <Button onClick={handleSubscribe} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : selectedPlan === 'free_trial' || selectedPlan === 'free' ? (
              <>Start Free Plan <ArrowRight className="h-4 w-4 ml-1" /></>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Subscribe with Paddle
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
