import React from "react";
import { User, MoreHorizontal, Shield, Trash2, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamMemberFull, Role } from "./types/team.types";

interface MemberListProps {
  members: TeamMemberFull[];
  roles: Role[];
  isLoading: boolean;
  currentUserHierarchy: number;
  canRemove: boolean;
  canChangeRole: boolean;
  onRemove: (member: TeamMemberFull) => void;
  onChangeRole: (member: TeamMemberFull, newRoleId: string) => void;
}

export function MemberList({
  members,
  roles,
  isLoading,
  currentUserHierarchy,
  canRemove,
  canChangeRole,
  onRemove,
  onChangeRole,
}: MemberListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-card border border-border rounded-lg animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No team members yet</h3>
        <p className="text-muted-foreground mt-1">Invite your first team member to get started</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case "inactive":
        return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const canManage = currentUserHierarchy > (member.role_hierarchy || 0);
        const displayName = member.display_name || member.full_name || member.email || "Unknown";
        const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

        return (
          <div
            key={member.id}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:bg-accent/5 transition-colors"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{displayName}</span>
                {getStatusBadge(member.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{member.email}</span>
                {member.department && (
                  <>
                    <span>•</span>
                    <span>{member.department}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canChangeRole && canManage ? (
                <Select
                  value={member.role_id}
                  onValueChange={(value) => onChangeRole(member, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((r) => r.hierarchy_level < currentUserHierarchy || r.is_default)
                      .map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: role.color }}
                            />
                            {role.display_name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  variant="outline"
                  style={{ borderColor: member.role_color, color: member.role_color }}
                >
                  {member.role_name || "Unknown Role"}
                </Badge>
              )}

              {canManage && (canRemove || canChangeRole) && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-2 hover:bg-accent rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <Shield className="w-4 h-4 mr-2" />
                      View Permissions
                    </DropdownMenuItem>
                    {canRemove && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onRemove(member)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MemberList;
