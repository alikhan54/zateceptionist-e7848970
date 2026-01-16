import React, { useState, useEffect } from "react";
import { Activity, User, Shield, Mail, Clock, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

interface ActivityEntry {
  id: string;
  action: string;
  actor_name: string;
  target_name?: string;
  details?: Record<string, any>;
  created_at: string;
}

export function ActivityLog() {
  const { tenantId } = useTenant();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const fetchActivities = async () => {
      if (!tenantId) return;
      setIsLoading(true);

      try {
        // Try to fetch from team_audit_log if it exists
        const { data, error } = await supabase
          .from("team_audit_log")
          .select("*")
          .eq("org_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && data) {
          setActivities(
            data.map((entry: any) => ({
              id: entry.id,
              action: entry.action,
              actor_name: entry.actor_name || "System",
              target_name: entry.target_name,
              details: entry.details,
              created_at: entry.created_at,
            }))
          );
        } else {
          // Fallback to mock data if table doesn't exist
          setActivities([
            {
              id: "1",
              action: "member_invited",
              actor_name: "Admin User",
              target_name: "john@example.com",
              created_at: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: "2",
              action: "role_changed",
              actor_name: "Admin User",
              target_name: "Jane Doe",
              details: { old_role: "Staff", new_role: "Manager" },
              created_at: new Date(Date.now() - 86400000).toISOString(),
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [tenantId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "member_invited":
        return <Mail className="w-4 h-4 text-blue-500" />;
      case "member_joined":
        return <User className="w-4 h-4 text-green-500" />;
      case "member_removed":
        return <User className="w-4 h-4 text-red-500" />;
      case "role_changed":
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionText = (entry: ActivityEntry) => {
    switch (entry.action) {
      case "member_invited":
        return `invited ${entry.target_name}`;
      case "member_joined":
        return `${entry.target_name} joined the team`;
      case "member_removed":
        return `removed ${entry.target_name}`;
      case "role_changed":
        return `changed ${entry.target_name}'s role${
          entry.details ? ` from ${entry.details.old_role} to ${entry.details.new_role}` : ""
        }`;
      case "invitation_resent":
        return `resent invitation to ${entry.target_name}`;
      case "invitation_revoked":
        return `revoked invitation for ${entry.target_name}`;
      default:
        return entry.action.replace(/_/g, " ");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-64 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No activity yet</h3>
        <p className="text-muted-foreground mt-1">Team activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing recent team activity</p>
        <Button variant="outline" size="sm" disabled>
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="space-y-1">
        {activities.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 p-3 hover:bg-accent/5 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              {getActionIcon(entry.action)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{entry.actor_name}</span>{" "}
                <span className="text-muted-foreground">{getActionText(entry)}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityLog;
