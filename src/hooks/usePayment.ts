import { useState, useCallback } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useTenant } from '@/contexts/TenantContext';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';

export type PaymentMethodType = 'card' | 'us_bank_account' | 'sepa_debit' | 'bacs_debit';

export interface SetupIntentResult {
  clientSecret: string;
  customerId: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  paymentMethodId?: string;
  error?: string;
}

export interface SubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  error?: string;
}

/**
 * Hook for Stripe payment setup during onboarding.
 * Supports multiple payment methods: Card, ACH, SEPA, BACS.
 */
export function usePayment() {
  const stripe = useStripe();
  const elements = useElements();
  const { tenantId, tenantConfig } = useTenant();

  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedPaymentMethodId, setVerifiedPaymentMethodId] = useState<string | null>(null);

  /**
   * Step 1: Create a Stripe Setup Intent via n8n webhook
   */
  const createSetupIntent = useCallback(async (
    paymentMethodType: PaymentMethodType = 'card'
  ): Promise<SetupIntentResult | null> => {
    if (!tenantId) {
      setError('No tenant ID available');
      return null;
    }

    setIsCreatingIntent(true);
    setError(null);

    try {
      const response = await callWebhook<{
        client_secret: string;
        customer_id: string;
      }>(
        WEBHOOKS.BILLING_SETUP_INTENT,
        {
          email: tenantConfig?.smtp_from_email || '',
          payment_method_types: [paymentMethodType],
        },
        tenantId
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create setup intent');
      }

      return {
        clientSecret: response.data.client_secret,
        customerId: response.data.customer_id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payment';
      setError(message);
      return null;
    } finally {
      setIsCreatingIntent(false);
    }
  }, [tenantId, tenantConfig]);

  /**
   * Step 2: Verify payment method using Stripe.js
   */
  const verifyPaymentMethod = useCallback(async (
    clientSecret: string,
    paymentMethodType: PaymentMethodType = 'card'
  ): Promise<PaymentVerificationResult> => {
    if (!stripe || !elements) {
      return { success: false, error: 'Stripe not loaded' };
    }

    setIsVerifying(true);
    setError(null);

    try {
      let result;

      switch (paymentMethodType) {
        case 'card': {
          const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            throw new Error('Card element not found');
          }
          result = await stripe.confirmCardSetup(clientSecret, {
            payment_method: { card: cardElement },
          });
          break;
        }
        case 'us_bank_account': {
          result = await stripe.confirmUsBankAccountSetup(clientSecret);
          break;
        }
        case 'sepa_debit': {
          result = await stripe.confirmSepaDebitSetup(clientSecret, {
            payment_method: {
              sepa_debit: elements.getElement('iban') as any,
              billing_details: {
                name: tenantConfig?.company_name || '',
                email: tenantConfig?.smtp_from_email || '',
              },
            },
          });
          break;
        }
        case 'bacs_debit': {
          result = await stripe.confirmBacsDebitSetup(clientSecret, {
            payment_method: {
              bacs_debit: {
                account_number: '', // Collected via Stripe Elements
                sort_code: '',
              },
              billing_details: {
                name: tenantConfig?.company_name || '',
                email: tenantConfig?.smtp_from_email || '',
                address: { line1: '', city: '', country: '', postal_code: '' },
              },
            },
          });
          break;
        }
        default:
          throw new Error(`Unsupported payment method: ${paymentMethodType}`);
      }

      if (result.error) {
        throw new Error(result.error.message || 'Payment verification failed');
      }

      const paymentMethodId = result.setupIntent?.payment_method as string;
      setVerifiedPaymentMethodId(paymentMethodId);

      return { success: true, paymentMethodId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment verification failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsVerifying(false);
    }
  }, [stripe, elements, tenantConfig]);

  /**
   * Step 3: Create subscription with verified payment method
   */
  const createSubscription = useCallback(async (
    planId: string,
    paymentMethodId?: string
  ): Promise<SubscriptionResult> => {
    if (!tenantId) {
      return { success: false, error: 'No tenant ID' };
    }

    // Free plan — no Stripe needed
    if (planId === 'free') {
      setIsSubscribing(true);
      try {
        const response = await callWebhook(
          WEBHOOKS.BILLING_CREATE_CHECKOUT,
          {
            plan_id: 'free',
            trial_period_days: 0,
          },
          tenantId
        );
        return {
          success: response.success,
          error: response.error,
        };
      } finally {
        setIsSubscribing(false);
      }
    }

    // Paid plan — needs payment method
    const methodId = paymentMethodId || verifiedPaymentMethodId;
    if (!methodId) {
      return { success: false, error: 'No verified payment method. Please verify your payment first.' };
    }

    setIsSubscribing(true);
    setError(null);

    try {
      const response = await callWebhook<{
        subscription_id?: string;
        url?: string;
      }>(
        WEBHOOKS.BILLING_CREATE_CHECKOUT,
        {
          plan_id: planId,
          payment_method_id: methodId,
          trial_period_days: 7,
          success_url: `${window.location.origin}/onboarding?payment=success`,
          cancel_url: `${window.location.origin}/onboarding?payment=canceled`,
        },
        tenantId
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create subscription');
      }

      // If webhook returns a redirect URL (Stripe Checkout), navigate
      if (response.data?.url) {
        window.location.href = response.data.url;
        return { success: true };
      }

      return {
        success: true,
        subscriptionId: response.data?.subscription_id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Subscription creation failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSubscribing(false);
    }
  }, [tenantId, verifiedPaymentMethodId]);

  /**
   * Combined flow: Setup Intent → Verify → Subscribe (for onboarding)
   */
  const setupAndSubscribe = useCallback(async (
    planId: string,
    paymentMethodType: PaymentMethodType = 'card'
  ): Promise<SubscriptionResult> => {
    // Free plan shortcut
    if (planId === 'free') {
      return createSubscription('free');
    }

    // Step 1: Create setup intent
    const intent = await createSetupIntent(paymentMethodType);
    if (!intent) {
      return { success: false, error: error || 'Failed to create setup intent' };
    }

    // Step 2: Verify payment method
    const verification = await verifyPaymentMethod(intent.clientSecret, paymentMethodType);
    if (!verification.success) {
      return { success: false, error: verification.error };
    }

    // Step 3: Create subscription
    return createSubscription(planId, verification.paymentMethodId);
  }, [createSetupIntent, verifyPaymentMethod, createSubscription, error]);

  return {
    // Individual steps
    createSetupIntent,
    verifyPaymentMethod,
    createSubscription,

    // Combined flow
    setupAndSubscribe,

    // State
    isLoading: isCreatingIntent || isVerifying || isSubscribing,
    isCreatingIntent,
    isVerifying,
    isSubscribing,
    error,
    verifiedPaymentMethodId,
    clearError: () => setError(null),
  };
}
