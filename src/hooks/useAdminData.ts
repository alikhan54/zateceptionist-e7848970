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
  monthly_value?: number;
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
// Uses the master_admin_all_tenants() RPC (SECURITY DEFINER + is_master_admin
// guard, 0 rows for non-admin). The previous direct tenant_config select was
// silently single-tenanted by RLS — the "1 tenant in the table" bug.
export function useAllTenants() {
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('master_admin_all_tenants');
      if (error) throw error;

      return (data || []).map((t: {
        tenant_id: string; company_name: string; industry: string;
        subscription_plan: string; subscription_status: string; created_at: string;
        onboarding_completed: boolean; white_label_enabled: boolean;
        users_count: number; monthly_value: number;
      }) => ({
        id: t.tenant_id,
        tenant_id: t.tenant_id,
        company_name: t.company_name,
        industry: t.industry,
        logo_url: null,
        subscription_status: t.subscription_status,
        subscription_plan: t.subscription_plan,
        email: '',
        features: null,
        has_whatsapp: false,
        has_email: false,
        has_voice: false,
        has_instagram: false,
        has_facebook: false,
        created_at: t.created_at,
        updated_at: t.created_at,
        users_count: Number(t.users_count) || 0,
        monthly_value: Number(t.monthly_value) || 0,
        status: t.subscription_status || 'active',
        plan: t.subscription_plan || 'starter',
      })) as TenantData[];
    },
  });
}

// Hook to fetch all users across all tenants (for master admin)
// Uses the master_admin_all_users() RPC (migration 42, SECURITY DEFINER +
// is_master_admin guard, 0 rows for non-admin). Replaces the RLS-limited
// direct users select.
export function useAllUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('master_admin_all_users');
      if (error) throw error;

      return (data || []).map((u: {
        id: string; email: string; full_name: string | null; role: string;
        tenant_id: string; tenant_company_name: string | null;
        is_active: boolean; last_sign_in: string | null; created_at: string;
      }) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        avatar_url: null,
        tenant_id: u.tenant_id,
        is_active: u.is_active,
        created_at: u.created_at,
        last_login: u.last_sign_in || undefined,
        role: u.role || 'staff',
        tenant_name: u.tenant_company_name || u.tenant_id,
      })) as UserData[];
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
// Cross-tenant counts via the master_admin RPCs (the direct count() queries were
// RLS-limited to a single tenant — the silent-single-tenant bug). MRR from
// master_admin_mrr_breakdown(). Activity uses audit_logs (cross-tenant policy exists).
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const { data: tenants } = await supabase.rpc('master_admin_all_tenants');
      const { data: users } = await supabase.rpc('master_admin_all_users');
      const { data: mrrRows } = await supabase.rpc('master_admin_mrr_breakdown');

      const tenantList = (tenants || []) as { subscription_status: string }[];
      const mrr = ((mrrRows || []) as { mrr: number | string }[])
        .reduce((sum, r) => sum + Number(r.mrr || 0), 0);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: activityCount } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      return {
        activeTenants: tenantList.filter((t) => t.subscription_status === 'active').length,
        totalTenants: tenantList.length,
        totalUsers: (users || []).length,
        activityToday: activityCount || 0,
        mrr,
        totalConversations: 0,
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "Audit log insert affected 0 rows. Your session may be missing tenant_id, or the RLS INSERT policy on audit_logs may be misconfigured."
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}

// Mutation to update tenant status
//
// NOTE: This path will return 0 rows for cross-tenant admin operations because
// the `rls_tenant_update_tenant_config` policy only allows an authenticated user
// to update THEIR OWN tenant row. Cross-tenant admin writes must be routed
// through a backend service_role endpoint (not browser). This hook preserves
// the existing behavior for same-tenant writes and throws a loud, actionable
// error for cross-tenant attempts instead of the opaque PGRST116.
export function useUpdateTenantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: string }) => {
      const { data, error } = await supabase
        .from('tenant_config')
        .update({ subscription_status: status, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "Tenant status update affected 0 rows. Cross-tenant admin writes are not supported from the browser — use a backend service_role endpoint or Supabase Studio."
        );
      }
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
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "User status update affected 0 rows. The user may not exist, or the RLS policy may be blocking cross-tenant writes."
        );
      }
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

// ============================================================================
// Phase 2B — per-tenant control. All writes go through the SECURITY DEFINER +
// is_master_admin()-guarded RPCs in migration 43 (browser direct writes are
// RLS-blocked to own-tenant). Each RPC is PER-TENANT (explicit tenant_id).
// ============================================================================
export interface TenantDetailData {
  tenant_id: string;
  company_name: string;
  industry: string;
  subscription_plan: string;
  subscription_status: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  white_label: boolean;
  white_label_tenant_cap: number | null;
  mod_sales: boolean;
  mod_marketing: boolean;
  mod_hr: boolean;
  mod_operations: boolean;
  mod_communications: boolean;
  mod_analytics: boolean;
  ai_sales: boolean;
  ai_marketing: boolean;
  ai_hr: boolean;
  ai_support: boolean;
  ai_voice: boolean;
}

// Read one tenant's control detail (module flags + brand + plan; no secret keys).
export function useTenantDetail(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'tenant-detail', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('master_admin_get_tenant_detail', { p_tenant_id: tenantId });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row || null) as TenantDetailData | null;
    },
  });
}

// Toggle ONE tenant's modules (merges features + ai_modules_enabled — preserves secrets).
export function useUpdateTenantModules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, features, aiModules }: {
      tenantId: string; features: Record<string, boolean>; aiModules: Record<string, boolean>;
    }) => {
      const { data, error } = await supabase.rpc('master_admin_update_tenant_modules', {
        p_tenant_id: tenantId, p_features: features, p_ai_modules: aiModules,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-detail', v.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });
}

// Edit ONE tenant's white-label.
export function useUpdateWhiteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      tenantId: string; brandName: string | null; logoUrl: string | null;
      primaryColor: string | null; secondaryColor: string | null; whiteLabel: boolean; cap: number | null;
    }) => {
      const { data, error } = await supabase.rpc('master_admin_update_white_label', {
        p_tenant_id: p.tenantId, p_brand_name: p.brandName, p_logo_url: p.logoUrl,
        p_primary_color: p.primaryColor, p_secondary_color: p.secondaryColor,
        p_white_label: p.whiteLabel, p_cap: p.cap,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-detail', v.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });
}

// Change ONE tenant's plan.
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, plan }: { tenantId: string; plan: string }) => {
      const { data, error } = await supabase.rpc('master_admin_update_plan', { p_tenant_id: tenantId, p_plan: plan });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenant-detail', v.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] });
    },
  });
}
