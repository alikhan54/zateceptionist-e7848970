import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface LeadScore {
  id: string;
  tenant_id: string;
  client_id: string;
  purchase_probability: number;
  urgency_level: string;
  score_grade: string;
  recommended_action: string;
  behavioral_score: number;
  financial_fit_score: number;
  visa_eligibility_score: number;
  engagement_score: number;
  urgency_score: number;
  score_breakdown: Record<string, any>;
  ai_summary: string;
  ai_model: string;
  previous_score: number | null;
  score_change: number;
  scored_at: string;
  // Joined from re_clients
  client_name?: string;
  client_nationality?: string;
  client_budget_max?: number;
  client_email?: string;
  client_phone?: string;
  client_golden_visa?: boolean;
}

export function useRELeadScores() {
  const { tenantId } = useTenant();

  const { data: scores = [], isLoading, error } = useQuery({
    queryKey: ["re-lead-scores", tenantId],
    queryFn: async () => {
      const { data: scoreData } = await supabase
        .from("re_lead_scores" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("purchase_probability", { ascending: false });

      const { data: clients } = await supabase
        .from("re_clients" as any)
        .select("id, full_name, first_name, last_name, nationality, budget_max, budget_min, email, phone, golden_visa_eligible")
        .eq("tenant_id", tenantId);

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c]));

      return (scoreData || []).map((s: any) => {
        const client = clientMap.get(s.client_id) || {};
        return {
          ...s,
          client_name: (client as any).full_name || `${(client as any).first_name || ""} ${(client as any).last_name || ""}`.trim() || "Unknown",
          client_nationality: (client as any).nationality || "",
          client_budget_max: Number((client as any).budget_max || (client as any).budget_min || 0),
          client_email: (client as any).email,
          client_phone: (client as any).phone,
          client_golden_visa: (client as any).golden_visa_eligible || false,
        } as LeadScore;
      });
    },
    enabled: !!tenantId,
  });

  const stats = {
    total: scores.length,
    gradeA: scores.filter((s) => s.score_grade === "A").length,
    gradeB: scores.filter((s) => s.score_grade === "B").length,
    gradeC: scores.filter((s) => s.score_grade === "C").length,
    gradeD: scores.filter((s) => s.score_grade === "D").length,
    avgScore: scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s.purchase_probability, 0) / scores.length) : 0,
    visaEligible: scores.filter((s) => {
      if (s.client_golden_visa) return true;
      const breakdown = s.score_breakdown || {};
      const visa = breakdown.visa || {};
      return visa.eligible || (visa.is_foreign && (s.client_budget_max || 0) >= 750000);
    }).length,
  };

  return { scores, isLoading, error, stats };
}
