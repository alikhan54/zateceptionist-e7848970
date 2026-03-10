import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

export interface HealthReport {
  id: string;
  tenant_id: string;
  patient_id: string;
  report_type: string;
  pdf_url: string | null;
  pdf_filename: string | null;
  uploaded_by: string | null;
  drive_file_id: string | null;
  extracted_data: Record<string, any>;
  severity_scores: Record<string, any>;
  overall_health_score: number | null;
  ai_summary: string | null;
  status: string;
  analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthAnalysis {
  id: string;
  tenant_id: string;
  patient_id: string;
  report_ids: string[];
  health_score: number | null;
  category_scores: Record<string, any>;
  correlations: any[];
  key_findings: any[];
  recommendations: any[];
  ai_analysis_raw: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const WEBHOOKS_BASE = "https://webhooks.zatesystems.com";

export function useHealthReports(patientId?: string) {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports = [], isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["clinic_medical_reports", tenantId, patientId],
    queryFn: async () => {
      let query = supabase
        .from("clinic_medical_reports" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as HealthReport[];
    },
    enabled: !!tenantId,
  });

  const { data: analyses = [], isLoading: analysesLoading, refetch: refetchAnalyses } = useQuery({
    queryKey: ["clinic_health_analyses", tenantId, patientId],
    queryFn: async () => {
      let query = supabase
        .from("clinic_health_analyses" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (patientId) {
        query = query.eq("patient_id", patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as HealthAnalysis[];
    },
    enabled: !!tenantId,
  });

  const uploadReportMutation = useMutation({
    mutationFn: async (params: {
      patient_id: string;
      report_type: string;
      pdf_base64?: string;
      pdf_filename?: string;
    }) => {
      const response = await fetch(`${WEBHOOKS_BASE}/webhook/doctor-avatar-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          patient_id: params.patient_id,
          report_type: params.report_type,
          pdf_base64: params.pdf_base64 || "",
          pdf_filename: params.pdf_filename || "report.pdf",
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Upload failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_medical_reports"] });
      queryClient.invalidateQueries({ queryKey: ["clinic_health_analyses"] });
      toast({ title: "Report uploaded", description: "AI analysis has been triggered." });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  // Aggregate stats
  const stats = {
    totalReports: reports.length,
    analyzedReports: reports.filter(r => r.status === "analyzed").length,
    pendingReports: reports.filter(r => ["uploaded", "analyzing"].includes(r.status)).length,
    avgHealthScore: analyses.length > 0
      ? Math.round(analyses.reduce((sum, a) => sum + (a.health_score || 0), 0) / analyses.length)
      : null,
    reportsThisMonth: reports.filter(r => {
      const d = new Date(r.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  return {
    reports,
    analyses,
    stats,
    isLoading: reportsLoading || analysesLoading,
    uploadReport: uploadReportMutation.mutateAsync,
    isUploading: uploadReportMutation.isPending,
    refetchReports,
    refetchAnalyses,
  };
}
