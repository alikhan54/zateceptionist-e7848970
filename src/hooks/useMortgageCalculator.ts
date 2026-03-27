import { useMutation } from "@tanstack/react-query";
import { callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface MortgageParams {
  property_value: number;
  property_type?: string;
  is_off_plan?: boolean;
  down_payment_pct?: number;
  nationality: string;
  residency_status: string;
  employment_type: string;
  monthly_income: number;
  age: number;
}

export interface BankOffer {
  bank: string;
  eligible: boolean;
  ineligibility_reason: string | null;
  fixed_rate: number;
  fixed_period_years: number;
  variable_rate: number;
  tenure_years: number;
  monthly_emi_aed: number;
  total_interest_aed: number;
  total_cost_aed: number;
  notes: string;
}

export interface MortgageResult {
  success: boolean;
  property_summary: { value_aed: number; type: string; is_off_plan: boolean; off_plan_note: string | null };
  buyer_profile: { nationality: string; residency_status: string; employment_type: string; monthly_income_aed: number; age: number; max_ltv: number };
  financing: { down_payment_pct: number; down_payment_aed: number; loan_amount_aed: number; min_down_note: string | null; dld_fee_aed: number; commission_aed: number; total_upfront_aed: number };
  bank_offers: BankOffer[];
  eligible_offers: number;
  best_rate: BankOffer | null;
  cross_border: { currency: string; currency_name: string; property_value: number; down_payment: number; monthly_emi: number; rate_note: string; home_financing_note: string } | null;
  golden_visa: { eligible: boolean; type?: string; benefits?: string[]; note?: string };
}

export function useMortgageCalculator() {
  const { tenantId } = useTenant();

  const mutation = useMutation({
    mutationFn: async (params: MortgageParams) => {
      const result = await callWebhook("/re-mortgage-calculator", params as any, tenantId || "");
      return result.data as MortgageResult;
    },
  });

  return {
    calculate: mutation.mutateAsync,
    result: mutation.data || null,
    isCalculating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
