import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export function useBrandVoice() {
  const { tenantConfig } = useTenant();

  const { data: brandVoice } = useQuery({
    queryKey: ["brand-voice", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return null;
      const { data, error } = await supabase
        .from("brand_voice_profiles" as any)
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data;
    },
    enabled: !!tenantConfig?.id,
    staleTime: 5 * 60 * 1000,
  });

  const brandPrompt = brandVoice ? buildBrandPrompt(brandVoice) : "";
  return { brandVoice, brandPrompt, hasBrandVoice: !!brandVoice };
}

function buildBrandPrompt(bv: any): string {
  if (bv.generated_system_prompt) return bv.generated_system_prompt;

  const parts: string[] = [];
  if (bv.brand_name) parts.push(`Brand: ${bv.brand_name}`);
  if (bv.tone?.length) parts.push(`Tone: ${bv.tone.join(", ")}`);
  if (bv.writing_style) parts.push(`Writing style: ${bv.writing_style}`);
  if (bv.target_audience) parts.push(`Target audience: ${bv.target_audience}`);
  if (bv.brand_values?.length) parts.push(`Brand values: ${bv.brand_values.join(", ")}`);
  if (bv.vocabulary_always_use?.length) parts.push(`Always use words: ${bv.vocabulary_always_use.join(", ")}`);
  if (bv.vocabulary_never_use?.length) parts.push(`Never use words: ${bv.vocabulary_never_use.join(", ")}`);
  if (bv.emoji_policy) parts.push(`Emoji policy: ${bv.emoji_policy}`);
  if (bv.content_guidelines) parts.push(`Guidelines: ${bv.content_guidelines}`);

  return parts.length > 0
    ? `BRAND VOICE GUIDELINES:\n${parts.join("\n")}\n\nApply these guidelines to all generated content.`
    : "";
}
