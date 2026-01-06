import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { fetchWebhook, WEBHOOKS } from '@/lib/api/webhooks';

// Types
export interface AnalyticsData {
  overview: {
    total_leads: number;
    total_deals: number;
    total_revenue: number;
    conversion_rate: number;
    avg_deal_value: number;
    leads_trend: number;
    deals_trend: number;
    revenue_trend: number;
  };
  leads_by_source: Array<{ source: string; count: number; percentage: number }>;
  deals_by_stage: Array<{ stage: string; count: number; value: number }>;
  revenue_by_month: Array<{ month: string; revenue: number; deals: number }>;
  top_performers: Array<{ user_id: string; name: string; deals: number; revenue: number }>;
  activity_timeline: Array<{ date: string; leads: number; deals: number; calls: number; emails: number }>;
}

export interface RealtimeData {
  active_users: number;
  active_calls: number;
  pending_messages: number;
  queue_size: number;
  recent_activities: Array<{
    id: string;
    type: string;
    description: string;
    user?: string;
    timestamp: string;
  }>;
  live_metrics: {
    calls_per_minute: number;
    messages_per_minute: number;
    api_latency: number;
    error_rate: number;
  };
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  granularity?: 'day' | 'week' | 'month';
  department?: string;
  user_id?: string;
}

export function useAnalyticsWebhooks() {
  const { tenantId: tid } = useTenant();
  const tenantId = tid || '';

  // Get Analytics Data
  const useAnalytics = (filters?: AnalyticsFilters) => {
    return useQuery({
      queryKey: ['analytics', tenantId, filters],
      queryFn: async () => {
        const params: Record<string, string> = {};
        if (filters?.start_date) params.start_date = filters.start_date;
        if (filters?.end_date) params.end_date = filters.end_date;
        if (filters?.granularity) params.granularity = filters.granularity;
        if (filters?.department) params.department = filters.department;
        if (filters?.user_id) params.user_id = filters.user_id;
        
        const result = await fetchWebhook<AnalyticsData>(WEBHOOKS.GET_ANALYTICS, tenantId, params);
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      enabled: !!tenantId,
      staleTime: 60000, // 1 minute
    });
  };

  // Get Realtime Data
  const useRealtime = () => {
    return useQuery({
      queryKey: ['analytics-realtime', tenantId],
      queryFn: async () => {
        const result = await fetchWebhook<RealtimeData>(WEBHOOKS.GET_REALTIME, tenantId);
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      enabled: !!tenantId,
      refetchInterval: 5000, // Refresh every 5 seconds
      staleTime: 0,
    });
  };

  // Custom date range analytics
  const useCustomAnalytics = (startDate: string, endDate: string, granularity: 'day' | 'week' | 'month' = 'day') => {
    return useQuery({
      queryKey: ['analytics-custom', tenantId, startDate, endDate, granularity],
      queryFn: async () => {
        const result = await fetchWebhook<AnalyticsData>(WEBHOOKS.GET_ANALYTICS, tenantId, {
          start_date: startDate,
          end_date: endDate,
          granularity,
        });
        if (!result.success) throw new Error(result.error);
        return result.data;
      },
      enabled: !!tenantId && !!startDate && !!endDate,
    });
  };

  return {
    useAnalytics,
    useRealtime,
    useCustomAnalytics,
  };
}
