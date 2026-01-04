// Re-export from integrations/supabase for backward compatibility
export { 
  supabase, 
  withTenantFilter, 
  callWebhook, 
  createTenantQuery,
  WEBHOOKS,
  N8N_WEBHOOK_BASE,
} from '@/integrations/supabase/client';

export type { User, Session, WebhookEndpoint } from '@/integrations/supabase/client';
