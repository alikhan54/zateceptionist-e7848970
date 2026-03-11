import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard, Building2, Check, ArrowRight, ChevronLeft, Loader2,
  Shield, AlertCircle, Sparkles,
} from 'lucide-react';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/contexts/SubscriptionContext';
import { OnboardingData } from '@/pages/onboarding/constants';
import { isStripeConfigured } from '@/lib/stripe';
import type { PaymentMethodType } from '@/hooks/usePayment';

// Lazy imports for Stripe — only used when Stripe is configured
let CardElement: any = null;
let usePayment: any = null;
if (isStripeConfigured) {
  try {
    CardElement = require('@stripe/react-stripe-js').CardElement;
    usePayment = require('@/hooks/usePayment').usePayment;
  } catch { /* Stripe not available */ }
}

interface PaymentStepProps {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const PLAN_ORDER: SubscriptionTier[] = ['free', 'starter', 'professional', 'enterprise'];

export default function PaymentStep({ data, updateData, onNext, onBack }: PaymentStepProps) {
  const [isYearly, setIsYearly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('card');

  // Only call usePayment when Stripe is configured and the hook is available
  const stripeHook = usePayment ? usePayment() : { setupAndSubscribe: null, isLoading: false, error: null, clearError: () => {} };
  const { setupAndSubscribe, isLoading, error: paymentError, clearError } = stripeHook;

  const selectedPlan = (data.selectedPlan || 'professional') as SubscriptionTier;

  const selectPlan = (planId: SubscriptionTier) => {
    updateData({ selectedPlan: planId });
    clearError();
  };

  const handleSubscribe = async () => {
    if (selectedPlan === 'free' || !setupAndSubscribe) {
      updateData({ paymentVerified: true, trialStarted: true });
      onNext();
      return;
    }

    const result = await setupAndSubscribe(selectedPlan, paymentMethod);
    if (result.success) {
      updateData({ paymentVerified: true, trialStarted: true });
      onNext();
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
        <p className="text-muted-foreground mt-1">Start with a 7-day free trial. No charge until the trial ends.</p>
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
          const price = isYearly ? Math.round(tier.yearlyPrice / 12) : tier.price;

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
              {tier.badge && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                  {tier.badge}
                </Badge>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${price}</span>
                  {price > 0 && <span className="text-muted-foreground text-sm">/mo</span>}
                </div>
                <CardDescription className="text-xs">{tier.description}</CardDescription>
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

      {/* Payment Method (for paid plans) */}
      {selectedPlan !== 'free' && isStripeConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
            <CardDescription>
              Your card will be verified but not charged. Trial starts after setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)}>
              <TabsList className="grid grid-cols-2 w-full max-w-sm">
                <TabsTrigger value="card" className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" /> Card
                </TabsTrigger>
                <TabsTrigger value="us_bank_account" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" /> Bank
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="mt-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#1a1a1a',
                          '::placeholder': { color: '#9ca3af' },
                        },
                      },
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="us_bank_account" className="mt-4">
                <Alert>
                  <Building2 className="h-4 w-4" />
                  <AlertDescription>
                    Bank account verification will open in a secure Stripe window after you click Subscribe.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secured by Stripe. Your payment info is never stored on our servers.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPlan !== 'free' && !isStripeConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payment processing is not configured yet. You can continue with the Free plan for now
            and upgrade later from Settings.
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {paymentError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{paymentError}</span>
            <Button variant="outline" size="sm" onClick={handleFreeFallback}>
              Continue Free
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          {selectedPlan !== 'free' && (
            <Button variant="outline" onClick={handleFreeFallback}>
              Continue Free Instead
            </Button>
          )}
          <Button onClick={handleSubscribe} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : selectedPlan === 'free' ? (
              <>Start Free Plan <ArrowRight className="h-4 w-4 ml-1" /></>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Start 7-Day Free Trial
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
