import React from "react";
import { Mail, Clock, RefreshCw, X, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { Invitation } from "./types/team.types";

interface InvitationListProps {
  invitations: Invitation[];
  isLoading: boolean;
  onResend: (invitationId: string) => Promise<{ success: boolean }>;
  onRevoke: (invitationId: string) => Promise<{ success: boolean }>;
}

export function InvitationList({ invitations, isLoading, onResend, onRevoke }: InvitationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 bg-card border border-border rounded-lg animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No invitations</h3>
        <p className="text-muted-foreground mt-1">All invitations have been accepted or expired</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Expired
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive">
            Revoked
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const isExpired = new Date(invitation.expires_at) < new Date();
        const isPending = invitation.status === "pending" && !isExpired;

        return (
          <div
            key={invitation.id}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{invitation.email}</span>
                {getStatusBadge(isExpired && invitation.status === "pending" ? "expired" : invitation.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Role: {invitation.role_name || "Unknown"}</span>
                <span>•</span>
                <span>
                  Sent {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </span>
                {invitation.inviter_name && (
                  <>
                    <span>•</span>
                    <span>by {invitation.inviter_name}</span>
                  </>
                )}
              </div>
            </div>

            {isPending && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onResend(invitation.id)}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Resend
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onRevoke(invitation.id)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Revoke
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default InvitationList;
