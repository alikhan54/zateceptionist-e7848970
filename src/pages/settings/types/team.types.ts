// ============================================================================
// TEAM TYPES - src/pages/settings/types/team.types.ts
// ============================================================================

export type MemberStatus = 'pending' | 'active' | 'inactive' | 'suspended';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface TeamMemberFull {
  id: string;
  user_id: string;
  org_id: string;
  role_id: string;
  status: MemberStatus;
  department: string | null;
  title: string | null;
  display_name: string | null;
  last_active_at: string | null;
  joined_at: string | null;
  created_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string | null;
  role_name?: string;
  role_color?: string;
  role_hierarchy?: number;
  user?: {
    email?: string;
    full_name?: string;
    avatar_url?: string | null;
  };
}

export interface Role {
  id: string;
  org_id: string | null;
  name: string;
  display_name: string;
  description: string | null;
  hierarchy_level: number;
  color: string;
  is_system: boolean;
  is_default: boolean;
  is_active: boolean;
}

export interface Invitation {
  id: string;
  org_id: string;
  email: string;
  role_id: string;
  invited_by: string;
  status: InvitationStatus;
  department: string | null;
  title: string | null;
  expires_at: string;
  created_at: string;
  role_name?: string;
  inviter_name?: string;
}

export interface InviteMemberForm {
  email: string;
  role_id: string;
  department?: string;
  title?: string;
  message?: string;
}

export interface TeamCapacity {
  can_add: boolean;
  current_count: number;
  max_size: number;
  plan_name: string;
  remaining_slots: number;
}

export interface AIRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}
