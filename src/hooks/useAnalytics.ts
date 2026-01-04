import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, subMonths, format } from 'date-fns';

export interface DashboardStats {
  totalCustomers: number;
  newCustomersToday: number;
  totalConversations: number;
  openConversations: number;
  appointmentsToday: number;
  upcomingAppointments: number;
  totalDeals: number;
  dealsValue: number;
  messagesThisMonth: number;
  callsThisMonth: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  deals: number;
}

export interface ChannelStats {
  channel: string;
  conversations: number;
  messages: number;
  responseRate: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  value: number;
}

export function useDashboardStats() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['analytics', 'dashboard', tenantId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!tenantId) {
        return {
          totalCustomers: 0,
          newCustomersToday: 0,
          totalConversations: 0,
          openConversations: 0,
          appointmentsToday: 0,
          upcomingAppointments: 0,
          totalDeals: 0,
          dealsValue: 0,
          messagesThisMonth: 0,
          callsThisMonth: 0,
        };
      }

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();
      const startOfMonth = subDays(today, 30).toISOString();

      // Fetch all stats in parallel
      const [
        customersResult,
        newCustomersResult,
        conversationsResult,
        openConversationsResult,
        todayAppointmentsResult,
        upcomingAppointmentsResult,
        dealsResult,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', startOfToday),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'open'),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('start_time', startOfToday).lte('start_time', endOfToday),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('start_time', today.toISOString()).in('status', ['scheduled', 'confirmed']),
        supabase.from('deals').select('id, value').eq('tenant_id', tenantId).not('stage', 'eq', 'Lost'),
      ]);

      const deals = (dealsResult.data || []) as { id: string; value: number }[];
      const totalDealsValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

      return {
        totalCustomers: customersResult.count || 0,
        newCustomersToday: newCustomersResult.count || 0,
        totalConversations: conversationsResult.count || 0,
        openConversations: openConversationsResult.count || 0,
        appointmentsToday: todayAppointmentsResult.count || 0,
        upcomingAppointments: upcomingAppointmentsResult.count || 0,
        totalDeals: deals.length,
        dealsValue: totalDealsValue,
        messagesThisMonth: 0, // Would need a messages count query
        callsThisMonth: 0, // Would need a calls count query
      };
    },
    enabled: !!tenantId,
    staleTime: 60000, // Cache for 1 minute
  });
}

export function useRevenueAnalytics(period: '7d' | '30d' | '90d' = '30d') {
  const { tenantId } = useTenant();

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  return useQuery({
    queryKey: ['analytics', 'revenue', tenantId, period],
    queryFn: async (): Promise<RevenueData[]> => {
      if (!tenantId) return [];

      const startDate = subDays(new Date(), periodDays);

      const { data, error } = await supabase
        .from('deals')
        .select('value, actual_close_date, created_at')
        .eq('tenant_id', tenantId)
        .eq('stage', 'Won')
        .gte('actual_close_date', startDate.toISOString())
        .order('actual_close_date', { ascending: true });

      if (error) throw error;

      // Group by date
      const revenueByDate: Record<string, { revenue: number; deals: number }> = {};
      
      // Initialize all dates in range
      for (let i = 0; i < periodDays; i++) {
        const date = format(subDays(new Date(), periodDays - 1 - i), 'yyyy-MM-dd');
        revenueByDate[date] = { revenue: 0, deals: 0 };
      }

      // Aggregate data
      (data || []).forEach((deal: { value: number; actual_close_date: string }) => {
        const date = format(new Date(deal.actual_close_date), 'yyyy-MM-dd');
        if (revenueByDate[date]) {
          revenueByDate[date].revenue += deal.value || 0;
          revenueByDate[date].deals += 1;
        }
      });

      return Object.entries(revenueByDate).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        deals: data.deals,
      }));
    },
    enabled: !!tenantId,
  });
}

export function useChannelAnalytics() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['analytics', 'channels', tenantId],
    queryFn: async (): Promise<ChannelStats[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select('channel')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Group by channel
      const channelCounts: Record<string, number> = {};
      (data || []).forEach((conv: { channel: string }) => {
        channelCounts[conv.channel] = (channelCounts[conv.channel] || 0) + 1;
      });

      return Object.entries(channelCounts).map(([channel, count]) => ({
        channel,
        conversations: count,
        messages: 0, // Would need to join with messages table
        responseRate: 0, // Would need more complex calculation
      }));
    },
    enabled: !!tenantId,
  });
}

export function useConversionFunnel() {
  const { tenantId } = useTenant();
  const { getDealStages } = useTenant();

  return useQuery({
    queryKey: ['analytics', 'funnel', tenantId],
    queryFn: async (): Promise<ConversionFunnel[]> => {
      if (!tenantId) return [];

      const stages = getDealStages();

      const { data, error } = await supabase
        .from('deals')
        .select('stage, value')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Group by stage
      const stageData: Record<string, { count: number; value: number }> = {};
      stages.forEach(stage => {
        stageData[stage] = { count: 0, value: 0 };
      });

      (data || []).forEach((deal: { stage: string; value: number }) => {
        if (stageData[deal.stage]) {
          stageData[deal.stage].count += 1;
          stageData[deal.stage].value += deal.value || 0;
        }
      });

      return stages.map(stage => ({
        stage,
        count: stageData[stage]?.count || 0,
        value: stageData[stage]?.value || 0,
      }));
    },
    enabled: !!tenantId,
  });
}

export function useLeadSourceAnalytics() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['analytics', 'lead-sources', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('sales_leads')
        .select('source, status')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Group by source
      const sourceData: Record<string, { total: number; won: number; lost: number }> = {};
      
      (data || []).forEach((lead: { source: string | null; status: string }) => {
        const source = lead.source || 'Unknown';
        if (!sourceData[source]) {
          sourceData[source] = { total: 0, won: 0, lost: 0 };
        }
        sourceData[source].total += 1;
        if (lead.status === 'won') sourceData[source].won += 1;
        if (lead.status === 'lost') sourceData[source].lost += 1;
      });

      return Object.entries(sourceData).map(([source, data]) => ({
        source,
        total: data.total,
        won: data.won,
        lost: data.lost,
        conversionRate: data.total > 0 ? (data.won / data.total) * 100 : 0,
      }));
    },
    enabled: !!tenantId,
  });
}

export function useActivityTimeline(limit = 20) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['analytics', 'activity', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get recent activities from multiple tables
      const [conversations, appointments, deals] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, customer_name, channel, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('appointments')
          .select('id, customer_name, title, start_time, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('deals')
          .select('id, name, stage, value, created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(limit),
      ]);

      // Combine and sort
      const activities = [
        ...(conversations.data || []).map((c: { id: string; customer_name: string | null; channel: string; created_at: string }) => ({
          id: c.id,
          type: 'conversation' as const,
          title: `New ${c.channel} conversation`,
          description: c.customer_name || 'Unknown customer',
          timestamp: c.created_at,
        })),
        ...(appointments.data || []).map((a: { id: string; customer_name: string; title: string; start_time: string; created_at: string }) => ({
          id: a.id,
          type: 'appointment' as const,
          title: a.title,
          description: `Appointment with ${a.customer_name}`,
          timestamp: a.created_at,
        })),
        ...(deals.data || []).map((d: { id: string; name: string; stage: string; value: number; created_at: string }) => ({
          id: d.id,
          type: 'deal' as const,
          title: d.name,
          description: `${d.stage} - $${d.value?.toLocaleString() || 0}`,
          timestamp: d.created_at,
        })),
      ];

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },
    enabled: !!tenantId,
  });
}
