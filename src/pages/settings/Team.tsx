// ============================================================================
// TEAM SETTINGS PAGE - src/pages/settings/Team.tsx
// Main Teams management component for Settings
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
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useTeam, usePermissions } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MoreVertical, Trash2, UserCog, Send, X } from "lucide-react";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Team() {
  const {
    members,
    invitations,
    roles,
    statistics,
    capacity,
    isLoading,
    inviteMember,
    removeMember,
    updateMemberRole,
    resendInvitation,
    revokeInvitation,
    refreshData,
  } = useTeam();

  const { hasPermission, canManageMember, currentUserHierarchy } = usePermissions();

  // State
  const [activeTab, setActiveTab] = useState<string>("members");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role_id: "",
    department: "",
    title: "",
    message: "",
  });

  // Permissions
  const canViewMembers = hasPermission("team.view_members", 1);
  const canInviteMembers = hasPermission("team.invite", 2);
  const canEditRoles = hasPermission("team.edit_roles", 2);
  const canRemoveMembers = hasPermission("team.remove_members", 3);

  // Computed
  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  const pendingInvitations = useMemo(() => invitations.filter((i) => i.status === "pending"), [invitations]);

  // Handlers
  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.role_id) return;

    setIsSubmitting(true);
    try {
      const result = await inviteMember({
        email: inviteForm.email,
        role_id: inviteForm.role_id,
        department: inviteForm.department || undefined,
        title: inviteForm.title || undefined,
        message: inviteForm.message || undefined,
      });

      if (result.success) {
        setIsInviteModalOpen(false);
        setInviteForm({ email: "", role_id: "", department: "", title: "", message: "" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm("Are you sure you want to remove this team member?")) {
      await removeMember(memberId);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (confirm("Are you sure you want to revoke this invitation?")) {
      await revokeInvitation(invitationId);
    }
  };

  // Get initials for avatar
  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "?";
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "inactive":
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    {/* Header */}
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-2xl font-semibold tracking-tight">Team Management</h2>
    <p className="text-muted-foreground">Manage your team members, roles, and invitations</p>
    <p className="text-xs text-red-500">
      Debug: canInvite={String(canInviteMembers)}, canAdd={String(capacity.can_add)}, hierarchy={currentUserHierarchy}
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
```

**Tell Lovable:**
```
In Team.tsx, find the Header section and:
1. Add debug text after "Manage your team members..." 
2. Remove the condition {canInviteMembers && capacity.can_add &&} from the Invite Member button - just show the button always

      {/* Capacity Banner */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {capacity.current_count} / {capacity.max_size} team members
              </p>
              <p className="text-sm text-muted-foreground">
                {capacity.plan_name} Plan • {capacity.remaining_slots} slots remaining
              </p>
            </div>
          </div>
          {!capacity.can_add && (
            <Button variant="outline" size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members ({activeMembers.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            Invitations ({pendingInvitations.length})
          </TabsTrigger>
          {canEditRoles && (
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              Roles ({roles.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>People who have access to this organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No team members yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Invite team members to collaborate on this organization
                    </p>
                    {canInviteMembers && (
                      <Button className="mt-4" onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite First Member
                      </Button>
                    )}
                  </div>
                ) : (
                  activeMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(member.full_name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{member.full_name || member.email}</p>
                            {member.role_hierarchy === 100 && <Crown className="h-4 w-4 text-amber-500" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" style={{ borderColor: member.role_color }} className="font-normal">
                          {member.role_name}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(member.status)}>
                          {member.status}
                        </Badge>
                        {canManageMember(member.role_hierarchy || 0) && canRemoveMembers && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEditRoles && (
                                <DropdownMenuItem>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Change Role
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Invitations waiting to be accepted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingInvitations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Mail className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No pending invitations</h3>
                    <p className="mt-2 text-sm text-muted-foreground">All invitations have been accepted or expired</p>
                  </div>
                ) : (
                  pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                          <Mail className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited as {invitation.role_name} • Expires{" "}
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => resendInvitation(invitation.id)}>
                          <Send className="mr-2 h-3 w-3" />
                          Resend
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                        >
                          <X className="mr-2 h-3 w-3" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>Define access levels for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${role.color}20` }}
                      >
                        <Shield className="h-5 w-5" style={{ color: role.color }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{role.display_name}</p>
                          {role.is_system && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {role.description || `Hierarchy level: ${role.hierarchy_level}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Level {role.hierarchy_level}</Badge>
                      {!role.is_system && (
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>Send an invitation to join your organization</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={inviteForm.role_id}
                onValueChange={(value) => setInviteForm({ ...inviteForm, role_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.hierarchy_level < currentUserHierarchy)
                    .map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
                          {role.display_name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g. Marketing"
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Manager"
                  value={inviteForm.title}
                  onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to the invitation..."
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteForm.email || !inviteForm.role_id || isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
