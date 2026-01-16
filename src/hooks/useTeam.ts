// ============================================================================
// TEAMS MANAGEMENT HOOK - src/hooks/useTeam.ts
// Copy this file to your Lovable project at src/hooks/useTeam.ts
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// TYPES
// ============================================================================

export type MemberStatus = "pending" | "active" | "inactive" | "suspended";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired" | "revoked";
export type AccessLevel = 0 | 1 | 2 | 3 | 4;

export interface TeamMember {
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
  // Joined fields
  email?: string;
  full_name?: string;
  avatar_url?: string | null;
  role_name?: string;
  role_color?: string;
  role_hierarchy?: number;
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
  // Joined fields
  role_name?: string;
  inviter_name?: string;
}

export interface TeamStatistics {
  total_members: number;
  active_members: number;
  pending_invitations: number;
  capacity: {
    can_add: boolean;
    current_count: number;
    max_size: number;
    plan_name: string;
    remaining_slots: number;
  };
}

export interface InviteMemberForm {
  email: string;
  role_id: string;
  department?: string;
  title?: string;
  message?: string;
}

// ============================================================================
// useTeam HOOK
// ============================================================================

export function useTeam() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const { tenantConfig } = useTenant();
  const orgId = tenantConfig?.id; // This is the UUID, not the slug

  // State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [statistics, setStatistics] = useState<TeamStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `
          *,
          users:user_id (
            email,
            full_name,
            avatar_url
          ),
          roles:role_id (
            name,
            display_name,
            color,
            hierarchy_level
          )
        `,
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedMembers: TeamMember[] = (data || []).map((m: any) => ({
        ...m,
        email: m.users?.email,
        full_name: m.users?.full_name,
        avatar_url: m.users?.avatar_url,
        role_name: m.roles?.display_name,
        role_color: m.roles?.color,
        role_hierarchy: m.roles?.hierarchy_level,
      }));

      setMembers(formattedMembers);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMembers(false);
    }
  }, [orgId, toast]);

  const fetchInvitations = useCallback(async () => {
    if (!orgId) return;
    setIsLoadingInvitations(true);
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select(
          `
          *,
          roles:role_id (
            display_name
          ),
          inviter:invited_by (
            full_name
          )
        `,
        )
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedInvitations: Invitation[] = (data || []).map((i: any) => ({
        ...i,
        role_name: i.roles?.display_name,
        inviter_name: i.inviter?.full_name,
      }));

      setInvitations(formattedInvitations);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [orgId]);

  const fetchRoles = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .or(`org_id.eq.${orgId},is_system.eq.true`)
        .eq("is_active", true)
        .order("hierarchy_level", { ascending: false });

      if (error) throw error;
      setRoles(data || []);
    } catch (error: any) {
      console.error("Error fetching roles:", error);
    }
  }, [orgId]);

  const fetchStatistics = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase.rpc("get_team_statistics", {
        p_org_id: orgId,
      });

      if (error) throw error;
      setStatistics(data);
    } catch (error: any) {
      console.error("Error fetching statistics:", error);
      // Fallback to manual calculation
      setStatistics({
        total_members: members.length,
        active_members: members.filter((m) => m.status === "active").length,
        pending_invitations: invitations.filter((i) => i.status === "pending").length,
        capacity: {
          can_add: true,
          current_count: members.length,
          max_size: 10,
          plan_name: "Professional",
          remaining_slots: 10 - members.length,
        },
      });
    }
  }, [orgId, members, invitations]);

  // Initial load
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchMembers(), fetchInvitations(), fetchRoles()]);
      setIsLoading(false);
    };

    loadAll();
  }, [orgId, fetchMembers, fetchInvitations, fetchRoles]);

  // Fetch statistics after members/invitations load
  useEffect(() => {
    if (!isLoading && orgId) {
      fetchStatistics();
    }
  }, [isLoading, orgId, fetchStatistics]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const inviteMember = useCallback(
    async (data: InviteMemberForm) => {
      if (!orgId) return { success: false, error: "No organization selected" };

      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: result, error } = await supabase.rpc("create_invitation", {
          p_org_id: orgId,
          p_email: data.email,
          p_role_id: data.role_id,
          p_invited_by: user.user.id,
          p_department: data.department || null,
          p_title: data.title || null,
          p_message: data.message || null,
        });

        if (error) throw error;

        if (result?.success) {
          toast({
            title: "Invitation Sent",
            description: `Invitation sent to ${data.email}`,
          });
          await fetchInvitations();
          await fetchStatistics();
          return { success: true };
        } else {
          toast({
            title: "Error",
            description: result?.error || "Failed to send invitation",
            variant: "destructive",
          });
          return { success: false, error: result?.error };
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }
    },
    [orgId, toast, fetchInvitations, fetchStatistics],
  );

  const removeMember = useCallback(
    async (memberId: string, reason?: string) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: result, error } = await supabase.rpc("remove_team_member", {
          p_member_id: memberId,
          p_removed_by: user.user.id,
          p_reason: reason || null,
        });

        if (error) throw error;

        if (result?.success) {
          toast({
            title: "Member Removed",
            description: result.message,
          });
          await fetchMembers();
          await fetchStatistics();
          return { success: true };
        } else {
          toast({
            title: "Error",
            description: result?.error || "Failed to remove member",
            variant: "destructive",
          });
          return { success: false, error: result?.error };
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }
    },
    [toast, fetchMembers, fetchStatistics],
  );

  const updateMemberRole = useCallback(
    async (memberId: string, newRoleId: string) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: result, error } = await supabase.rpc("update_team_member_role", {
          p_member_id: memberId,
          p_new_role_id: newRoleId,
          p_updated_by: user.user.id,
        });

        if (error) throw error;

        if (result?.success) {
          toast({
            title: "Role Updated",
            description: result.message,
          });
          await fetchMembers();
          return { success: true };
        } else {
          toast({
            title: "Error",
            description: result?.error || "Failed to update role",
            variant: "destructive",
          });
          return { success: false, error: result?.error };
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }
    },
    [toast, fetchMembers],
  );

  const resendInvitation = useCallback(
    async (invitationId: string) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: result, error } = await supabase.rpc("resend_invitation", {
          p_invitation_id: invitationId,
          p_resent_by: user.user.id,
        });

        if (error) throw error;

        if (result?.success) {
          toast({
            title: "Invitation Resent",
            description: `New invitation sent to ${result.email}`,
          });
          await fetchInvitations();
          return { success: true };
        } else {
          toast({
            title: "Error",
            description: result?.error || "Failed to resend invitation",
            variant: "destructive",
          });
          return { success: false, error: result?.error };
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }
    },
    [toast, fetchInvitations],
  );

  const revokeInvitation = useCallback(
    async (invitationId: string) => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: result, error } = await supabase.rpc("revoke_invitation", {
          p_invitation_id: invitationId,
          p_revoked_by: user.user.id,
        });

        if (error) throw error;

        if (result?.success) {
          toast({
            title: "Invitation Revoked",
            description: "The invitation has been cancelled",
          });
          await fetchInvitations();
          return { success: true };
        } else {
          toast({
            title: "Error",
            description: result?.error || "Failed to revoke invitation",
            variant: "destructive",
          });
          return { success: false, error: result?.error };
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }
    },
    [toast, fetchInvitations],
  );

  const suggestRole = useCallback(
    async (jobTitle: string, department?: string) => {
      if (!orgId) return null;

      try {
        const { data, error } = await supabase.rpc("suggest_role_for_member", {
          p_org_id: orgId,
          p_job_title: jobTitle,
          p_department: department || null,
        });

        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error("Error getting role suggestion:", error);
        return null;
      }
    },
    [orgId],
  );

  const createRole = useCallback(
    async (roleData: {
      name: string;
      display_name: string;
      description?: string;
      hierarchy_level: number;
      color?: string;
      copy_from_role_id?: string;
    }) => {
      if (!orgId) return { success: false, error: "No organization selected" };

      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) throw new Error("Not authenticated");

        const { data: result, error } = await supabase.rpc("create_custom_role", {
          p_org_id: orgId,
          p_name: roleData.name,
          p_display_name: roleData.display_name,
          p_description: roleData.description || null,
          p_hierarchy_level: roleData.hierarchy_level,
          p_color: roleData.color || null,
          p_created_by: user.user.id,
          p_copy_from_role_id: roleData.copy_from_role_id || null,
        });

        if (error) throw error;

        if (result?.success) {
          toast({
            title: "Role Created",
            description: `${roleData.display_name} role has been created`,
          });
          await fetchRoles();
          return { success: true, role_id: result.role_id };
        } else {
          toast({
            title: "Error",
            description: result?.error || "Failed to create role",
            variant: "destructive",
          });
          return { success: false, error: result?.error };
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }
    },
    [orgId, toast, fetchRoles],
  );

  const refreshData = useCallback(async () => {
    await Promise.all([fetchMembers(), fetchInvitations(), fetchRoles(), fetchStatistics()]);
  }, [fetchMembers, fetchInvitations, fetchRoles, fetchStatistics]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const capacity = useMemo(
    () =>
      statistics?.capacity || {
        can_add: true,
        current_count: members.length,
        max_size: 10,
        plan_name: "Professional",
        remaining_slots: 10 - members.length,
      },
    [statistics, members],
  );

  const recommendations = useMemo(() => [], []);

  return {
    // Data
    members,
    invitations,
    roles,
    statistics,
    capacity,
    recommendations,

    // Loading states
    isLoading,
    isLoadingMembers,
    isLoadingInvitations,

    // Actions
    inviteMember,
    removeMember,
    updateMemberRole,
    resendInvitation,
    revokeInvitation,
    suggestRole,
    createRole,
    refreshData,

    // Placeholder functions
    applyRecommendation: async () => ({ success: true }),
    dismissRecommendation: async () => ({ success: true }),
  };
}

// ============================================================================
// usePermissions HOOK
// ============================================================================

export function usePermissions() {
  const { tenantId } = useTenant();
  const orgId = tenantId;
  const [currentUserHierarchy, setCurrentUserHierarchy] = useState<number>(0);
  const [userPermissions, setUserPermissions] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadPermissions = async () => {
      if (!orgId) return;

      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Get user's role hierarchy
        const { data: memberData } = await supabase
          .from("team_members")
          .select(
            `
            role_id,
            roles:role_id (
              hierarchy_level
            )
          `,
          )
          .eq("org_id", orgId)
          .eq("user_id", user.user.id)
          .eq("status", "active")
          .single();

        if (memberData?.roles) {
          setCurrentUserHierarchy((memberData.roles as any).hierarchy_level || 0);
        }

        // For now, give full permissions to admins/owners
        // In production, load from role_permissions table
        const hierarchy = (memberData?.roles as any)?.hierarchy_level || 0;
        if (hierarchy >= 80) {
          // Admin or higher
          setUserPermissions({
            "team.view_members": 4,
            "team.invite": 4,
            "team.edit_roles": 4,
            "team.remove_members": 4,
            "team.manage_permissions": 4,
            "security.view_audit_logs": 4,
          });
        } else if (hierarchy >= 60) {
          // Manager
          setUserPermissions({
            "team.view_members": 3,
            "team.invite": 2,
            "team.edit_roles": 1,
            "team.remove_members": 1,
            "team.manage_permissions": 0,
            "security.view_audit_logs": 1,
          });
        } else {
          // Staff/Viewer
          setUserPermissions({
            "team.view_members": 1,
            "team.invite": 0,
            "team.edit_roles": 0,
            "team.remove_members": 0,
            "team.manage_permissions": 0,
            "security.view_audit_logs": 0,
          });
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
      }
    };

    loadPermissions();
  }, [orgId]);

  const hasPermission = useCallback(
    (permissionCode: string, requiredLevel: number = 1): boolean => {
      const userLevel = userPermissions[permissionCode] || 0;
      return userLevel >= requiredLevel;
    },
    [userPermissions],
  );

  const canManageMember = useCallback(
    (targetHierarchy: number): boolean => {
      return currentUserHierarchy > targetHierarchy;
    },
    [currentUserHierarchy],
  );

  return {
    hasPermission,
    canManageMember,
    currentUserHierarchy,
    userPermissions,
  };
}

export default useTeam;
