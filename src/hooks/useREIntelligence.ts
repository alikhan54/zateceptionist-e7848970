import { useState } from "react";
import { callWebhook } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export function useREIntelligence() {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(false);

  const getDealAdvice = async (params: Record<string, unknown>) => {
    if (!tenantId) return null;
    setIsLoading(true);
    try {
      const result = await callWebhook("/ai-tool/deal-advisor", params, tenantId);
      return result?.data || null;
    } catch (err) {
      console.error("Deal advice error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const calculateYield = async (params: Record<string, unknown>) => {
    if (!tenantId) return null;
    setIsLoading(true);
    try {
      const result = await callWebhook("/ai-tool/yield-calculator", params, tenantId);
      return result?.data || null;
    } catch (err) {
      console.error("Yield calculation error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { getDealAdvice, calculateYield, isLoading };
}
