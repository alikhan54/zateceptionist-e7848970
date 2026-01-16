// ============================================================================
// TEAMS MANAGEMENT SYSTEM - TeamSettings Component
// Main container for the Teams tab in Settings
// ============================================================================

import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Activity,
  Sparkles,
  Crown,
  ChevronRight,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { useTeam, usePermissions } from "@/hooks/useTeam";
import { MemberList } from "./MemberList";
import { InviteModal } from "./InviteModal";
import { RoleManager } from "./RoleManager";
import { InvitationList } from "./InvitationList";
import { ActivityLog } from "./ActivityLog";
import { AIInsights } from "./AIInsights";
import type { TeamMemberFull, InviteMemberForm } from "./types/team.types";

// ============================================================================
// TYPES
// ============================================================================

type TabType = "members" | "roles" | "invitations" | "activity";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamSettings() {
  // Hooks
  const {
    members,
    invitations,
    roles,
    statistics,
    recommendations,
    capacity,
    isLoading,
    isLoadingMembers,
    isLoadingInvitations,
    inviteMember,
    removeMember,
    updateMemberRole,
    resendInvitation,
    revokeInvitation,
    createRole,
    suggestRole,
    applyRecommendation,
    dismissRecommendation,
    refreshData,
  } = useTeam();

  const { hasPermission, canManageMember, currentUserHierarchy } = usePermissions();

  // State
  const [activeTab, setActiveTab] = useState<TabType>("members");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permissions
  const canViewMembers = hasPermission("team.view_members", 1);
  const canInviteMembers = hasPermission("team.invite", 2);
  const canEditRoles = hasPermission("team.edit_roles", 2);
  const canRemoveMembers = hasPermission("team.remove_members", 3);
  const canManagePermissions = hasPermission("team.manage_permissions", 2);
  const canViewAuditLogs = hasPermission("security.view_audit_logs", 1);

  // Computed
  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  const pendingMembers = useMemo(() => members.filter((m) => m.status === "pending"), [members]);

  const pendingInvitations = useMemo(() => invitations.filter((i) => i.status === "pending"), [invitations]);

  // Handlers
  const handleInvite = async (data: InviteMemberForm) => {
    setIsSubmitting(true);
    try {
      const result = await inviteMember(data);
      if (result.success) {
        setIsInviteModalOpen(false);
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: TeamMemberFull) => {
    if (!confirm(`Are you sure you want to remove ${member.display_name || member.user?.full_name}?`)) {
      return;
    }
    await removeMember(member.id);
  };

  const handleChangeRole = async (member: TeamMemberFull, newRoleId: string) => {
    await updateMemberRole(member.id, newRoleId);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading team data...</p>
        </div>
      </div>
    );
  }

  // Permission Check
  if (!canViewMembers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-md">
          You don't have permission to view team members. Contact your administrator to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage your team members, roles, and permissions</p>
        </div>

        {canInviteMembers && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            disabled={!capacity.can_add}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Capacity Warning */}
      {!capacity.can_add && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-600 dark:text-amber-400">Team limit reached</p>
            <p className="text-sm text-muted-foreground">
              Your {capacity.plan_name} plan allows up to {capacity.max_size} team members. Upgrade to add more.
            </p>
          </div>
          <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
            Upgrade Plan
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          icon={<Users className="w-5 h-5" />}
          label="Active Members"
          value={activeMembers.length}
          total={capacity.max_size}
          color="blue"
        />
        <StatsCard
          icon={<Mail className="w-5 h-5" />}
          label="Pending Invites"
          value={pendingInvitations.length}
          color="amber"
        />
        <StatsCard icon={<Shield className="w-5 h-5" />} label="Roles" value={roles.length} color="purple" />
        <StatsCard
          icon={<Sparkles className="w-5 h-5" />}
          label="AI Insights"
          value={recommendations.length}
          color="emerald"
        />
      </div>

      {/* AI Insights (if any) */}
      {recommendations.length > 0 && (
        <AIInsights recommendations={recommendations} onApply={applyRecommendation} onDismiss={dismissRecommendation} />
      )}

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          <TabButton
            active={activeTab === "members"}
            onClick={() => setActiveTab("members")}
            icon={<Users className="w-4 h-4" />}
            label="Members"
            count={activeMembers.length}
          />
          <TabButton
            active={activeTab === "roles"}
            onClick={() => setActiveTab("roles")}
            icon={<Crown className="w-4 h-4" />}
            label="Roles"
            count={roles.length}
            disabled={!canEditRoles}
          />
          <TabButton
            active={activeTab === "invitations"}
            onClick={() => setActiveTab("invitations")}
            icon={<Mail className="w-4 h-4" />}
            label="Invitations"
            count={pendingInvitations.length}
            disabled={!canInviteMembers}
          />
          {canViewAuditLogs && (
            <TabButton
              active={activeTab === "activity"}
              onClick={() => setActiveTab("activity")}
              icon={<Activity className="w-4 h-4" />}
              label="Activity"
            />
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "members" && (
          <MemberList
            members={members}
            roles={roles}
            isLoading={isLoadingMembers}
            currentUserHierarchy={currentUserHierarchy}
            canRemove={canRemoveMembers}
            canChangeRole={canEditRoles}
            onRemove={handleRemoveMember}
            onChangeRole={handleChangeRole}
          />
        )}

        {activeTab === "roles" && canEditRoles && (
          <RoleManager
            roles={roles}
            canCreate={canManagePermissions}
            canEdit={canEditRoles}
            currentUserHierarchy={currentUserHierarchy}
            onCreateRole={createRole}
          />
        )}

        {activeTab === "invitations" && canInviteMembers && (
          <InvitationList
            invitations={invitations}
            isLoading={isLoadingInvitations}
            onResend={resendInvitation}
            onRevoke={revokeInvitation}
          />
        )}

        {activeTab === "activity" && canViewAuditLogs && <ActivityLog />}
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
        roles={roles.filter((r) => r.hierarchy_level < currentUserHierarchy || r.is_default)}
        capacity={capacity}
        isLoading={isSubmitting}
        onSuggestRole={suggestRole}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  color: "blue" | "amber" | "purple" | "emerald";
}

function StatsCard({ icon, label, value, total, color }: StatsCardProps) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">
            {value}
            {total && <span className="text-sm font-normal text-muted-foreground">/{total}</span>}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
}

function TabButton({ active, onClick, icon, label, count, disabled }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
        ${
          active
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`
            px-2 py-0.5 text-xs rounded-full
            ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
          `}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default TeamSettings;
