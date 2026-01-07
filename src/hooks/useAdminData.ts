import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface TenantData {
  id: string;
  tenant_id: string;
  company_name: string;
  industry: string;
  logo_url: string | null;
  subscription_status: string;
  subscription_plan: string;
  email: string;
  features: Record<string, boolean> | null;
  has_whatsapp: boolean;
  has_email: boolean;
  has_voice: boolean;
  has_instagram: boolean;
  has_facebook: boolean;
  created_at: string;
  updated_at: string;
  users_count?: number;
  status?: string;
  plan?: string;
}

export interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  role?: string;
  tenant_name?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_email: string;
  action: string;
  resource: string;
  details: string;
  ip_address: string;
  level: 'info' | 'warning' | 'error' | 'success';
  metadata: Record<string, unknown>;
  created_at: string;
  tenant_name?: string;
}

// Hook to fetch all tenants (for master admin)
export function useAllTenants() {
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get user counts per tenant
      const { data: userCounts } = await supabase
        .from('users')
        .select('tenant_id');
      
      const countMap: Record<string, number> = {};
      (userCounts || []).forEach((u: { tenant_id: string }) => {
        countMap[u.tenant_id] = (countMap[u.tenant_id] || 0) + 1;
      });

      return (data || []).map((t: TenantData) => ({
        ...t,
        users_count: countMap[t.tenant_id] || 0,
        status: t.subscription_status || 'active',
        plan: t.subscription_plan || 'starter',
      }));
    },
  });
}

// Hook to fetch all users across all tenants (for master admin)
export function useAllUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      // Fetch users
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap: Record<string, string> = {};
      (roles || []).forEach((r: { user_id: string; role: string }) => {
        roleMap[r.user_id] = r.role;
      });

      // Fetch tenant names
      const { data: tenants } = await supabase
        .from('tenant_config')
        .select('tenant_id, company_name');

      const tenantMap: Record<string, string> = {};
      (tenants || []).forEach((t: { tenant_id: string; company_name: string }) => {
        tenantMap[t.tenant_id] = t.company_name;
      });

      return (users || []).map((u: UserData) => ({
        ...u,
        role: roleMap[u.id] || 'staff',
        tenant_name: tenantMap[u.tenant_id] || u.tenant_id,
      }));
    },
  });
}

// Hook to fetch audit logs (for master admin)
export function useAuditLogs(options?: { limit?: number; tenantFilter?: string }) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', options],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.tenantFilter && options.tenantFilter !== 'all' && options.tenantFilter !== 'All Tenants') {
        query = query.eq('tenant_id', options.tenantFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      // Get tenant names
      const { data: tenants } = await supabase
        .from('tenant_config')
        .select('tenant_id, company_name');

      const tenantMap: Record<string, string> = {};
      (tenants || []).forEach((t: { tenant_id: string; company_name: string }) => {
        tenantMap[t.tenant_id] = t.company_name;
      });

      return (data || []).map((log: AuditLog) => ({
        ...log,
        tenant_name: tenantMap[log.tenant_id] || log.tenant_id || 'System',
      }));
    },
  });
}

// Hook for admin dashboard stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      // Get tenant count
      const { count: tenantCount } = await supabase
        .from('tenant_config')
        .select('*', { count: 'exact', head: true });

      // Get user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get recent audit log count (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: activityCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Get conversation count
      const { count: conversationCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      return {
        activeTenants: tenantCount || 0,
        totalUsers: userCount || 0,
        activityToday: activityCount || 0,
        totalConversations: conversationCount || 0,
      };
    },
  });
}

// Mutation to create audit log
export function useCreateAuditLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (log: Omit<AuditLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}

// Mutation to update tenant status
export function useUpdateTenantStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const { data, error } = await supabase
        .from('tenant_config')
        .update({ subscription_status: status, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });
}

// Mutation to update user active status
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

// Hook to get log stats
export function useAuditLogStats() {
  return useQuery({
    queryKey: ['admin', 'audit-log-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Total logs
      const { count: totalCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      // Today's logs
      const { count: todayCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Warning count
      const { count: warningCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'warning');

      // Error count
      const { count: errorCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('level', 'error');

      return {
        total: totalCount || 0,
        today: todayCount || 0,
        warnings: warningCount || 0,
        errors: errorCount || 0,
      };
    },
  });
}
