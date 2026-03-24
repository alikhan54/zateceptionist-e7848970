// Paddle integration — placeholder until Paddle account is approved
// Replaces Stripe for payment processing (better for international/Payoneer)

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

// TODO: Replace with actual Paddle seller ID after approval
export const PADDLE_SELLER_ID = 'PLACEHOLDER';
export const PADDLE_ENV: 'sandbox' | 'production' = 'sandbox';

let paddleInitialized = false;

export const initPaddle = async (): Promise<void> => {
  if (paddleInitialized || typeof window === 'undefined') return;

  // Load Paddle.js script
  if (!window.Paddle) {
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.async = true;
    document.head.appendChild(script);

    await new Promise<void>((resolve) => {
      script.onload = () => resolve();
    });
  }

  // Initialize — uncomment when Paddle account is approved
  // window.Paddle?.Environment.set(PADDLE_ENV);
  // window.Paddle?.Initialize({
  //   token: 'PADDLE_CLIENT_TOKEN', // Replace with actual client-side token
  //   eventCallback: handlePaddleEvent,
  // });

  paddleInitialized = true;
};

export const openCheckout = async (
  priceId: string,
  tenantId: string,
  email: string,
): Promise<void> => {
  if (!window.Paddle) {
    console.warn('Paddle not initialized — account pending approval');
    // For now, show a message that billing is being set up
    alert('Payment processing is being configured. Please contact support.');
    return;
  }

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email },
    customData: { tenant_id: tenantId },
    settings: {
      displayMode: 'overlay',
      theme: 'dark',
      successUrl: `${window.location.origin}/settings/billing?success=true`,
    },
  });
};

// Handle Paddle events (subscription lifecycle)
const handlePaddleEvent = (event: unknown) => {
  console.log('[Paddle] Event:', event);
  // Events are also sent to /webhook/billing/paddle-webhook via server-side webhooks
};
