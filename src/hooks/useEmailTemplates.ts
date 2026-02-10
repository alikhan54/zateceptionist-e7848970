import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";

// ============================================
// ACTUAL DATABASE SCHEMA for email_templates:
// - tenant_id: TEXT (not UUID!) - uses slug
// - name: TEXT
// - template_key: TEXT
// - subject: TEXT
// - body_html: TEXT (not html_content!)
// - body_text: TEXT
// - variables: JSONB (not available_tokens!)
// - category: TEXT
// - industry: TEXT
// - times_sent: INTEGER (not times_used!)
// - times_opened: INTEGER
// - times_clicked: INTEGER
// - is_active: BOOLEAN
// - created_at, updated_at: TIMESTAMPTZ
// ============================================

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string | null;
  template_key: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  variables: Record<string, any> | null;
  category: string | null;
  industry: string | null;
  times_sent: number | null;
  times_opened: number | null;
  times_clicked: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useEmailTemplates(options?: { category?: string }) {
  // IMPORTANT: email_templates uses TEXT tenant_id (slug), not UUID
  const { tenantId } = useTenant(); // This is the SLUG
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["email_templates", tenantId, options?.category],
    queryFn: async (): Promise<EmailTemplate[]> => {
      if (!tenantId) return [];

      let query = supabase
        .from("email_templates")
        .select("*")
        .eq("tenant_id", tenantId) // Uses SLUG
        .eq("is_active", true)
        .order("times_sent", { ascending: false, nullsFirst: false });

      if (options?.category) {
        query = query.eq("category", options.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const createTemplate = useMutation({
    mutationFn: async (input: {
      name: string;
      subject: string;
      body_html: string;
      body_text?: string;
      category?: string;
      variables?: Record<string, any>;
      industry?: string;
    }) => {
      if (!tenantId) throw new Error("No tenant");

      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          tenant_id: tenantId, // SLUG
          name: input.name,
          subject: input.subject,
          body_html: input.body_html,
          body_text: input.body_text || null,
          category: input.category || "general",
          variables: input.variables || {},
          industry: input.industry || null,
          times_sent: 0,
          times_opened: 0,
          times_clicked: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates", tenantId] });
      toast({ title: "Template Created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create template", description: err.message, variant: "destructive" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates", tenantId] });
      toast({ title: "Template Updated" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - just set is_active to false
      const { error } = await supabase
        .from("email_templates")
        .update({ is_active: false })
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_templates", tenantId] });
      toast({ title: "Template Deleted" });
    },
  });

  // Calculate stats
  const stats = {
    total: templates.length,
    categories: [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[],
    mostUsed: templates.slice(0, 5),
    totalSent: templates.reduce((sum, t) => sum + (t.times_sent || 0), 0),
    avgOpenRate:
      templates.length > 0
        ? Math.round(
            templates.reduce((sum, t) => {
              if (t.times_sent && t.times_sent > 0) {
                return sum + ((t.times_opened || 0) / t.times_sent) * 100;
              }
              return sum;
            }, 0) / templates.filter((t) => t.times_sent && t.times_sent > 0).length || 0,
          )
        : 0,
  };

  return {
    templates,
    isLoading,
    error,
    refetch,
    stats,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

export default useEmailTemplates;
