import React, { useState } from "react";
import { Crown, Plus, Edit2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "./types/team.types";

interface RoleManagerProps {
  roles: Role[];
  canCreate: boolean;
  canEdit: boolean;
  currentUserHierarchy: number;
  onCreateRole: (roleData: {
    name: string;
    display_name: string;
    description?: string;
    hierarchy_level: number;
    color?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function RoleManager({
  roles,
  canCreate,
  canEdit,
  currentUserHierarchy,
  onCreateRole,
}: RoleManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    hierarchy_level: 30,
    color: "#6366f1",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newRole.name || !newRole.display_name) return;

    setIsSubmitting(true);
    const result = await onCreateRole({
      name: newRole.name.toLowerCase().replace(/\s+/g, "_"),
      display_name: newRole.display_name,
      description: newRole.description || undefined,
      hierarchy_level: newRole.hierarchy_level,
      color: newRole.color,
    });

    if (result.success) {
      setNewRole({ name: "", display_name: "", description: "", hierarchy_level: 30, color: "#6366f1" });
      setIsCreateOpen(false);
    }
    setIsSubmitting(false);
  };

  const sortedRoles = [...roles].sort((a, b) => b.hierarchy_level - a.hierarchy_level);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Role Hierarchy</h3>
          <p className="text-sm text-muted-foreground">
            Roles are ordered by hierarchy level. Higher levels can manage lower levels.
          </p>
        </div>
        {canCreate && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Custom Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="e.g., Team Lead"
                    value={newRole.display_name}
                    onChange={(e) =>
                      setNewRole({
                        ...newRole,
                        display_name: e.target.value,
                        name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What can this role do?"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hierarchy Level (1-100)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={currentUserHierarchy - 1}
                      value={newRole.hierarchy_level}
                      onChange={(e) =>
                        setNewRole({ ...newRole, hierarchy_level: parseInt(e.target.value) || 30 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Max: {currentUserHierarchy - 1}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={newRole.color}
                        onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={newRole.color}
                        onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {sortedRoles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${role.color}20` }}
            >
              <Crown className="w-5 h-5" style={{ color: role.color }} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{role.display_name}</span>
                {role.is_system && (
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>
                )}
                {role.is_default && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {role.description || `Level ${role.hierarchy_level}`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="outline" style={{ borderColor: role.color, color: role.color }}>
                Level {role.hierarchy_level}
              </Badge>
              {canEdit && !role.is_system && role.hierarchy_level < currentUserHierarchy && (
                <Button variant="ghost" size="icon" disabled>
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoleManager;
