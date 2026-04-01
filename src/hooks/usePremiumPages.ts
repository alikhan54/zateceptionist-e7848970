import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";

// ============================================================
// PAGE TEMPLATES (system-wide, no tenant filter)
// ============================================================

export function usePageTemplates() {
  return useQuery({
    queryKey: ["page-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("usage_count", { ascending: false });
      if (error) console.error("page_templates query error:", error);
      return (data || []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================
// PREMIUM PAGES (tenant-scoped)
// ============================================================

export function usePremiumPages() {
  const { tenantConfig } = useTenant();
  const tid = tenantConfig?.id;

  return useQuery({
    queryKey: ["premium-pages", tid],
    queryFn: async () => {
      if (!tid) return [];
      const { data, error } = await supabase
        .from("premium_pages" as any)
        .select("*")
        .eq("tenant_id", tid)
        .order("updated_at", { ascending: false });
      if (error) console.error("premium_pages query error:", error);
      return (data || []) as any[];
    },
    enabled: !!tid,
  });
}

export function usePremiumPage(pageId: string | undefined) {
  return useQuery({
    queryKey: ["premium-page", pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from("premium_pages" as any)
        .select("*")
        .eq("id", pageId)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!pageId,
  });
}

// ============================================================
// MUTATIONS
// ============================================================

export function useCreatePremiumPage() {
  const queryClient = useQueryClient();
  const { tenantConfig } = useTenant();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (page: Record<string, any>) => {
      const { data, error } = await supabase
        .from("premium_pages" as any)
        .insert({ ...page, tenant_id: tenantConfig?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium-pages"] });
      toast({ title: "Page Created", description: "Your premium page has been saved as draft." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create page", variant: "destructive" });
    },
  });
}

export function useUpdatePremiumPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { data, error } = await supabase
        .from("premium_pages" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["premium-pages"] });
      queryClient.invalidateQueries({ queryKey: ["premium-page", variables.id] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update page", variant: "destructive" });
    },
  });
}

export function useDeletePremiumPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("premium_pages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium-pages"] });
      toast({ title: "Deleted", description: "Page has been removed." });
    },
  });
}

// ============================================================
// FRAME EXTRACTION
// ============================================================

export function useExtractFrames() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      video_url: string;
      tenant_id: string;
      project_id: string;
      frame_count?: number;
      quality?: string;
      format?: string;
    }) => {
      const resp = await fetch("http://localhost:8125/extract-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: params.video_url,
          tenant_id: params.tenant_id,
          project_id: params.project_id,
          frame_count: params.frame_count || 30,
          quality: params.quality || "medium",
          format: params.format || "jpg",
        }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Frame extraction failed");
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Frames Extracted!", description: `${data.frame_count} frames ready for scroll animation.` });
    },
    onError: (err: any) => {
      toast({ title: "Extraction Failed", description: err.message, variant: "destructive" });
    },
  });
}

// ============================================================
// PAGE ANALYTICS
// ============================================================

export function usePageAnalytics(pageId: string | undefined) {
  return useQuery({
    queryKey: ["page-analytics", pageId],
    queryFn: async () => {
      if (!pageId) return { views: 0, conversions: 0, avgScrollDepth: 0 };
      const { data } = await supabase
        .from("page_analytics" as any)
        .select("event_type, event_data")
        .eq("page_id", pageId);
      const events = (data || []) as any[];
      const views = events.filter((e) => e.event_type === "view").length;
      const exits = events.filter((e) => e.event_type === "exit");
      const avgScroll = exits.length > 0
        ? exits.reduce((sum: number, e: any) => sum + (e.event_data?.scroll_depth || 0), 0) / exits.length
        : 0;
      return { views, conversions: 0, avgScrollDepth: Math.round(avgScroll) };
    },
    enabled: !!pageId,
  });
}
