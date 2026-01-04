// Re-export everything from client
export {
  supabase,
  withTenantFilter,
  callWebhook,
  createTenantQuery,
  WEBHOOKS,
  N8N_WEBHOOK_BASE,
} from './client';

export type {
  User,
  Session,
  WebhookEndpoint,
} from './client';
