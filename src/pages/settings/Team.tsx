import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Shield, Mail, RefreshCw, Activity, Sparkles } from "lucide-react";
import { useTeam, usePermissions } from "@/hooks/useTeam";
import { MemberList } from "./MemberList";
import { InviteModal } from "./InviteModal";
import { RoleManager } from "./RoleManager";
import { InvitationList } from "./InvitationList";
import { ActivityLog } from "./ActivityLog";
import { AIInsights } from "./AIInsights";

export default function Team() {
  const {
    members,
    invitations,
    roles,
    statistics,
    capacity,
    recommendations,
    isLoading,
    isLoadingMembers,
    isLoadingInvitations,
    inviteMember,
    removeMember,
    updateMemberRole,
    resendInvitation,
    revokeInvitation,
    suggestRole,
    createRole,
    refreshData,
    applyRecommendation,
    dismissRecommendation,
  } = useTeam();

  const { hasPermission, canManageMember, currentUserHierarchy } = usePermissions();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("members");

  // Permission checks
  const canViewMembers = hasPermission("team.view_members", 1);
  const canInviteMembers = hasPermission("team.invite", 1);
  const canEditRoles = hasPermission("team.edit_roles", 1);
  const canRemoveMembers = hasPermission("team.remove_members", 1);

  if (!canViewMembers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">
          You don't have permission to view team members.
        </p>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Manage your team members, roles, and invitations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refreshData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total_members || members.length}</div>
            <p className="text-xs text-muted-foreground">
              {capacity.remaining_slots} slots remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.active_members || members.filter((m) => m.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
            <Mail className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Defined roles</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {recommendations.length > 0 && (
        <AIInsights
          recommendations={recommendations}
          onApply={applyRecommendation}
          onDismiss={dismissRecommendation}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations ({pendingInvitations.length})
          </TabsTrigger>
          {canEditRoles && (
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles ({roles.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <MemberList
            members={members}
            roles={roles}
            isLoading={isLoadingMembers}
            currentUserHierarchy={currentUserHierarchy}
            canRemove={canRemoveMembers}
            canChangeRole={canEditRoles}
            onRemove={(member) => removeMember(member.id)}
            onChangeRole={(member, newRoleId) => updateMemberRole(member.id, newRoleId)}
          />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <InvitationList
            invitations={invitations}
            isLoading={isLoadingInvitations}
            onResend={resendInvitation}
            onRevoke={revokeInvitation}
          />
        </TabsContent>

        {canEditRoles && (
          <TabsContent value="roles" className="space-y-4">
            <RoleManager
              roles={roles}
              canCreate={canEditRoles}
              canEdit={canEditRoles}
              currentUserHierarchy={currentUserHierarchy}
              onCreateRole={createRole}
            />
          </TabsContent>
        )}

        <TabsContent value="activity" className="space-y-4">
          <ActivityLog />
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        roles={roles}
        onInvite={inviteMember}
        onSuggestRole={suggestRole}
        capacity={capacity}
        isLoading={isLoading}
      />
    </div>
  );
}
