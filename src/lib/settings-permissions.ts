import type { UserRole } from '@/contexts/AuthContext';

/**
 * Per-page Settings access rules. Source of truth for which roles can view
 * which Settings pages.
 *
 * Data source: `useAuth().authUser.role` (read from public.user_roles by
 * AuthContext.fetchAuthUser). 35/41 tenants populated post F0-B backfill
 * (2026-05-24). Tenants without a user_roles row default to 'staff' per
 * AuthContext line 155 — which then gates most Settings pages.
 *
 * Role policy (approved 2026-05-24 Phase 4 [F0-A]):
 *   master_admin / admin → every Settings page
 *   manager              → company_info, knowledge_base, notifications, team (read-only views downstream)
 *                         BLOCKED: billing, integrations, ai_training, outreach
 *                         (manager view on team is allowed because they need to see
 *                          who's on the team — the in-page Invite/Remove buttons
 *                          remain gated by their own permissions inside the page.)
 *   staff                → notifications only
 *
 * Pages NOT listed here default-deny. Roles not in the array default-deny.
 */
export const SETTINGS_PAGE_ACCESS: Record<SettingsPageKey, UserRole[]> = {
  company_info:    ['master_admin', 'admin', 'manager'],
  knowledge_base:  ['master_admin', 'admin', 'manager'],
  ai_training:     ['master_admin', 'admin'],
  integrations:    ['master_admin', 'admin'],
  team:            ['master_admin', 'admin'],
  billing:         ['master_admin', 'admin'],
  notifications:   ['master_admin', 'admin', 'manager', 'staff'],
  outreach:        ['master_admin', 'admin'],
};

export type SettingsPageKey =
  | 'company_info'
  | 'knowledge_base'
  | 'ai_training'
  | 'integrations'
  | 'team'
  | 'billing'
  | 'notifications'
  | 'outreach';

/**
 * Returns true if the given role is permitted to view the given Settings page.
 * Returns false for unknown role (null/undefined) or unlisted page.
 */
export function canViewSettingsPage(
  pageKey: SettingsPageKey,
  role: UserRole | null | undefined,
): boolean {
  if (!role) return false;
  const allowed = SETTINGS_PAGE_ACCESS[pageKey];
  if (!allowed) return false;
  return allowed.includes(role);
}
