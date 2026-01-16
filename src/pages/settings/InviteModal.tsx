import React, { useState } from "react";
import { X, UserPlus, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Role, InviteMemberForm, TeamCapacity } from "./types/team.types";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: InviteMemberForm) => Promise<{ success: boolean; error?: string }>;
  roles: Role[];
  capacity: TeamCapacity;
  isLoading: boolean;
  onSuggestRole: (jobTitle: string, department?: string) => Promise<any>;
}

export function InviteModal({
  isOpen,
  onClose,
  onInvite,
  roles,
  capacity,
  isLoading,
  onSuggestRole,
}: InviteModalProps) {
  const [form, setForm] = useState<InviteMemberForm>({
    email: "",
    role_id: "",
    department: "",
    title: "",
    message: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.email || !form.role_id) {
      setError("Email and role are required");
      return;
    }

    const result = await onInvite(form);
    if (result.success) {
      setForm({ email: "", role_id: "", department: "", title: "", message: "" });
      onClose();
    } else {
      setError(result.error || "Failed to send invitation");
    }
  };

  const handleSuggestRole = async () => {
    if (form.title) {
      const suggestion = await onSuggestRole(form.title, form.department);
      if (suggestion?.role_id) {
        setForm((prev) => ({ ...prev, role_id: suggestion.role_id }));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!capacity.can_add && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Team limit reached ({capacity.current_count}/{capacity.max_size})
              </p>
              <p className="text-muted-foreground">Upgrade your plan to invite more members.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={!capacity.can_add || isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                placeholder="e.g., Sales Manager"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onBlur={handleSuggestRole}
                disabled={!capacity.can_add || isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., Sales"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                disabled={!capacity.can_add || isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={form.role_id}
              onValueChange={(value) => setForm({ ...form, role_id: value })}
              disabled={!capacity.can_add || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span>{role.display_name}</span>
                      {role.is_default && (
                        <span className="text-xs text-muted-foreground">(Default)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation email..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              disabled={!capacity.can_add || isLoading}
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!capacity.can_add || isLoading}>
              {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default InviteModal;
