import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { callWebhook } from "@/integrations/supabase/client";
import {
  Bot,
  Check,
  X,
  Mail,
  Phone,
  MessageCircle,
  ChevronRight,
  Clock,
  CheckCheck,
  Sparkles,
} from "lucide-react";

interface PendingAction {
  id: string;
  tenant_id: string;
  module: string;
  action_type: string;
  lead_id: string | null;
  lead_name: string | null;
  lead_company: string | null;
  summary: string;
  action_data: Record<string, unknown>;
  status: string;
  priority: string;
  suggested_at: string;
  expires_at: string;
}

function ActionIcon({ type }: { type: string }) {
  switch (type) {
    case "send_email":
      return <Mail className="h-4 w-4 text-blue-500" />;
    case "make_call":
      return <Phone className="h-4 w-4 text-green-500" />;
    case "send_whatsapp":
      return <MessageCircle className="h-4 w-4 text-emerald-500" />;
    default:
      return <Bot className="h-4 w-4 text-purple-500" />;
  }
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    normal: "bg-blue-100 text-blue-800",
    low: "bg-gray-100 text-gray-800",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[priority] || colors.normal}`}>
      {priority}
    </Badge>
  );
}

export function PendingActions() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const aiMode = tenantConfig?.ai_mode || "assisted";
  const isAssisted =
    aiMode === "assisted" ||
    Object.values(tenantConfig?.ai_modules_enabled || {}).some(
      (v) => v === true
    );

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["pending-actions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("pending_actions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .order("suggested_at", { ascending: false })
        .limit(10);
      if (error) {
        console.error("[PendingActions] Error:", error);
        return [];
      }
      return (data || []) as PendingAction[];
    },
    enabled: !!tenantId && isAssisted,
    refetchInterval: 30000,
  });

  // Count of today's executed actions
  const { data: todayExecuted = 0 } = useQuery({
    queryKey: ["executed-actions-today", tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("pending_actions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "executed")
        .gte("executed_at", today.toISOString());
      if (error) return 0;
      return count || 0;
    },
    enabled: !!tenantId,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("pending_actions")
        .update({
          status,
          decided_at: new Date().toISOString(),
          decided_by: "user",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      if (status === "approved" && tenantId) {
        await callWebhook("execute-pending-action", { action_id: id }, tenantId);
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-actions", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["executed-actions-today", tenantId] });
      toast({
        title: status === "approved" ? "Action approved" : "Action rejected",
        description: status === "approved" ? "The action will be executed shortly" : "The action has been skipped",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const approveAll = async () => {
    for (const action of actions) {
      await actionMutation.mutateAsync({ id: action.id, status: "approved" });
    }
  };

  const rejectAll = async () => {
    for (const action of actions) {
      await actionMutation.mutateAsync({ id: action.id, status: "rejected" });
    }
  };

  // Autonomous mode: show completion log
  if (aiMode === "autonomous") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-green-500" />
              AI Activity
            </CardTitle>
            <Badge variant="outline" className="text-xs border-green-500 text-green-600">
              Autonomous
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCheck className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium">AI completed {todayExecuted} actions today</p>
              <p className="text-xs text-muted-foreground">
                Running in autonomous mode — all actions are executed automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manual mode: show nothing
  if (aiMode === "manual") {
    return null;
  }

  // Assisted mode: show pending actions
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-500" />
            AI Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">No pending actions</p>
              <p className="text-xs text-muted-foreground">
                AI suggestions will appear here when leads are due for outreach
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-500" />
            AI Suggestions
          </CardTitle>
          <Badge variant="secondary">{actions.length} pending</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {actions.length} action{actions.length !== 1 ? "s" : ""} waiting for your approval
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ActionIcon type={action.action_type} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{action.summary}</p>
                {action.lead_company && (
                  <p className="text-xs text-muted-foreground truncate">
                    at {action.lead_company}
                  </p>
                )}
              </div>
              {action.priority !== "normal" && <PriorityBadge priority={action.priority} />}
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => actionMutation.mutate({ id: action.id, status: "approved" })}
                disabled={actionMutation.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => actionMutation.mutate({ id: action.id, status: "rejected" })}
                disabled={actionMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {actions.length > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={approveAll} disabled={actionMutation.isPending}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Approve All
            </Button>
            <Button variant="ghost" size="sm" onClick={rejectAll} disabled={actionMutation.isPending}>
              <X className="h-4 w-4 mr-1" />
              Reject All
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
