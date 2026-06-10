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

// ============================================================================
// Phase 3 — lifecycle signals (read-only). Reuses the existing 1B RPC
// derive_lifecycle_signals(null), which for a master_admin returns one row per
// tenant with the REAL last_active (MAX auth.users.last_sign_in_at across the
// tenant's users) and a derived lifecycle_stage. ZERO new DDL — authenticated
// already has EXECUTE and the is_master_admin() guard scopes access.
// ============================================================================
export type LifecycleStage =
  | 'new' | 'never_activated' | 'activating' | 'active' | 'silent' | 'at_risk' | 'churned';

export interface LifecycleSignal {
  tenant_id: string;
  company_name: string;
  signup_date: string | null;
  days_since_signup: number | null;
  onboarding_completed: boolean;
  last_active: string | null;
  days_silent: number | null;
  subscription_plan: string | null;
  monthly_value: number;
  is_paid: boolean;
  billing_status: string | null;
  lifecycle_stage: LifecycleStage;
}

// Display config for each lifecycle stage. `attention` marks the cohorts that
// matter for retention (surfaced prominently on the dashboard).
export const LIFECYCLE_CONFIG: Record<LifecycleStage, {
  label: string; className: string; attention: boolean; order: number; hint: string;
}> = {
  active:          { label: 'Active',          className: 'bg-green-500/10 text-green-600 border-green-500/30',   attention: false, order: 0, hint: 'Logged in within the last 3 days' },
  new:             { label: 'New',             className: 'bg-blue-500/10 text-blue-600 border-blue-500/30',      attention: false, order: 1, hint: 'Signed up within the last day' },
  activating:      { label: 'Activating',      className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',      attention: false, order: 2, hint: 'Logged in but onboarding not finished' },
  silent:          { label: 'Silent',          className: 'bg-slate-400/10 text-slate-500 border-slate-400/30',   attention: false, order: 3, hint: 'No login in 3–7 days' },
  at_risk:         { label: 'At risk',         className: 'bg-orange-500/10 text-orange-600 border-orange-500/30', attention: true,  order: 4, hint: 'No login in 7–30 days' },
  never_activated: { label: 'Never activated', className: 'bg-red-500/10 text-red-600 border-red-500/30',         attention: true,  order: 5, hint: 'No user has ever logged in' },
  churned:         { label: 'Churned',         className: 'bg-muted text-muted-foreground border-border',         attention: true,  order: 6, hint: 'No login in over 30 days' },
};

export function useLifecycleSignals() {
  return useQuery({
    queryKey: ['admin', 'lifecycle'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('derive_lifecycle_signals', { p_tenant_id: null });
      if (error) throw error;
      return (data || []).map((r: LifecycleSignal) => ({
        ...r,
        monthly_value: Number(r.monthly_value) || 0,
      })) as LifecycleSignal[];
    },
  });
}

// ============================================================================
// Phase 4 — real per-tenant usage (read-only). Calls master_admin_tenant_usage()
// (migration 44): SECURITY DEFINER + is_master_admin() guard — 0 rows for
// non-admins. One row per tenant with real counts from the usage tables
// (correct SLUG/UUID join per table verified in Phase 4.0).
// ============================================================================
export interface TenantUsage {
  tenant_id: string;
  conversations_total: number; conversations_7d: number; last_conversation_at: string | null;
  messages_total: number; messages_7d: number; last_message_at: string | null;
  leads_total: number; leads_7d: number; last_lead_at: string | null;
  appointments_total: number; appointments_7d: number; last_appointment_at: string | null;
}

export function useTenantUsage() {
  return useQuery({
    queryKey: ['admin', 'tenant-usage'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('master_admin_tenant_usage');
      if (error) throw error;
      return (data || []).map((r: TenantUsage) => ({
        ...r,
        conversations_total: Number(r.conversations_total) || 0,
        conversations_7d: Number(r.conversations_7d) || 0,
        messages_total: Number(r.messages_total) || 0,
        messages_7d: Number(r.messages_7d) || 0,
        leads_total: Number(r.leads_total) || 0,
        leads_7d: Number(r.leads_7d) || 0,
        appointments_total: Number(r.appointments_total) || 0,
        appointments_7d: Number(r.appointments_7d) || 0,
      })) as TenantUsage[];
    },
  });
}

// Mutation to create audit log
//
// Routed through the SECURITY DEFINER RPC log_audit_event (migration 45) instead
// of a direct table insert: the direct insert was RLS-blocked for cross-tenant
// master-admin writes (tenant_isolation_rls_fix requires the caller's own
// tenant_id). The RPC derives user/email/tenant from the JWT server-side and
// honors p_tenant_id only for master_admin callers, so call sites stay unchanged.
export function useCreateAuditLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Omit<AuditLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.rpc('log_audit_event', {
        p_action: log.action,
        p_resource: log.resource,
        p_details: log.details,
        p_level: log.level,
        p_metadata: log.metadata ?? {},
        p_tenant_id: log.tenant_id || null,
      });

      if (error) throw error;
      if (!data) {
        throw new Error(
          'Audit log write was skipped — this session has no profile row (users.auth_id) to attribute the event to.'
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-log-stats'] });
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
