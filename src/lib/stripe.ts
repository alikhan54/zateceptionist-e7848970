import { loadStripe } from '@stripe/stripe-js';

// Stripe publishable key — set via environment variable
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Lazy-loaded Stripe instance (singleton)
export const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

// Check if Stripe is configured
export const isStripeConfigured = !!STRIPE_PUBLISHABLE_KEY;
