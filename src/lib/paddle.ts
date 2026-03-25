// Paddle Billing integration for 420 System
// Live credentials — Paddle account approved

import { PADDLE_CONFIG, SUBSCRIPTION_TIERS, type SubscriptionTierId } from './pricing';

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (config: { token: string; eventCallback?: (event: unknown) => void }) => void;
      Checkout: {
        open: (config: {
          items: Array<{ priceId: string; quantity: number }>;
          customer?: { email: string };
          customData?: Record<string, string>;
          settings?: {
            displayMode?: 'overlay' | 'inline';
            theme?: 'light' | 'dark';
            successUrl?: string;
          };
        }) => void;
      };
    };
  }
}

let paddleInitialized = false;

export const initPaddle = async (): Promise<boolean> => {
  if (paddleInitialized && window.Paddle) return true;
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    if (window.Paddle) {
      window.Paddle.Initialize({
        token: PADDLE_CONFIG.clientToken,
        eventCallback: handlePaddleEvent,
      });
      paddleInitialized = true;
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    script.onload = () => {
      window.Paddle?.Initialize({
        token: PADDLE_CONFIG.clientToken,
        eventCallback: handlePaddleEvent,
      });
      paddleInitialized = true;
      resolve(true);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

export const openCheckout = async (
  tier: SubscriptionTierId,
  tenantId: string,
  email: string,
): Promise<void> => {
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig?.paddle_price_id) return;

  const ready = await initPaddle();
  if (!ready || !window.Paddle) {
    console.error('Paddle failed to initialize');
    return;
  }

  window.Paddle.Checkout.open({
    items: [{ priceId: tierConfig.paddle_price_id, quantity: 1 }],
    customer: { email },
    customData: { tenant_id: tenantId },
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      successUrl: `${window.location.origin}/settings/billing?success=true`,
    },
  });
};

const handlePaddleEvent = (event: any) => {
  console.log('[Paddle] Event:', event);

  // Handle checkout completion on client side
  if (event?.name === 'checkout.completed' || event?.type === 'checkout.completed') {
    // Paddle webhook will handle DB updates server-side
    // Redirect to success page after short delay for webhook to process
    setTimeout(() => {
      window.location.href = '/settings/billing?success=true';
    }, 2000);
  }

  if (event?.name === 'checkout.closed' || event?.type === 'checkout.closed') {
    console.log('[Paddle] Checkout closed by user');
  }
};
