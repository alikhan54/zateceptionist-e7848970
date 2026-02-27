import { supabase } from '@/integrations/supabase/client';

/**
 * Log a system event for cross-department tracking.
 * Fire-and-forget — does not throw on failure.
 */
export async function logSystemEvent(params: {
  tenantId: string;
  eventType: string;
  sourceModule: 'marketing' | 'sales' | 'hr' | 'operations' | 'communications';
  targetModule?: string;
  eventData?: Record<string, any>;
}) {
  try {
    await supabase.from('system_events' as any).insert({
      tenant_id: params.tenantId,
      event_type: params.eventType,
      source_module: params.sourceModule,
      target_module: params.targetModule || null,
      event_data: params.eventData || {},
    });
  } catch {
    // Silent fail — event logging should never block UI
  }
}
