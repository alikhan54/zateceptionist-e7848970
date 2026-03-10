import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

export interface ReviewQueueItem {
  id: string;
  tenant_id: string;
  patient_id: string | null;
  report_id: string | null;
  health_analysis_id: string | null;
  video_script_id: string | null;
  review_type: string;
  priority: string;
  status: string;
  patient_name: string | null;
  summary: string | null;
  reviewer_name: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const WEBHOOKS_BASE = "https://webhooks.zatesystems.com";

export function useReviewQueue(statusFilter?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ["clinic_medical_review_queue", tenantId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("clinic_medical_review_queue" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ReviewQueueItem[];
    },
    enabled: !!tenantId,
  });

  const reviewMutation = useMutation({
    mutationFn: async (params: {
      review_id: string;
      action: "approve" | "reject" | "revision_needed";
      reviewer_name?: string;
      reviewer_notes?: string;
    }) => {
      const response = await fetch(`${WEBHOOKS_BASE}/webhook/doctor-avatar-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          review_id: params.review_id,
          action: params.action,
          reviewer_name: params.reviewer_name || "Doctor",
          reviewer_notes: params.reviewer_notes || "",
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Review action failed");
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clinic_medical_review_queue"] });
      queryClient.invalidateQueries({ queryKey: ["clinic_medical_reports"] });
      queryClient.invalidateQueries({ queryKey: ["clinic_health_analyses"] });
      toast({
        title: `Item ${variables.action === "approve" ? "approved" : variables.action === "reject" ? "rejected" : "sent for revision"}`,
        description: "Review queue updated.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Review action failed", description: err.message, variant: "destructive" });
    },
  });

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
    urgent: items.filter(i => i.priority === "urgent").length,
  };

  return {
    items,
    stats,
    isLoading,
    reviewItem: reviewMutation.mutateAsync,
    isReviewing: reviewMutation.isPending,
    refetch,
  };
}
