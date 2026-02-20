import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/contexts/TenantContext";

export interface LandingPage {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  template?: string;
  html_content?: string;
  status: "draft" | "published" | "archived";
  views: number;
  conversions: number;
  conversion_rate: number;
  published_url?: string;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}

export function useLandingPages() {
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["landing_pages", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("tenant_id", tenantUuid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  const createPage = useMutation({
    mutationFn: async (input: Partial<LandingPage>) => {
      if (!tenantUuid) throw new Error("No tenant");
      const slug = (input.name || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { data, error } = await supabase
        .from("landing_pages")
        .insert({
          tenant_id: tenantUuid,
          name: input.name,
          slug: slug + "-" + Date.now(),
          template: input.template,
          html_content: input.html_content,
          status: "draft",
          views: 0,
          conversions: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing_pages", tenantUuid] });
      toast({ title: "Landing Page Created" });
    },
  });

  const publishPage = useMutation({
    mutationFn: async (pageId: string) => {
      const { data, error } = await supabase
        .from("landing_pages")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          published_url: `inline-preview://${pageId}`,
        })
        .eq("id", pageId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing_pages", tenantUuid] });
      toast({ title: "Page Published" });
    },
  });

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase.from("landing_pages").delete().eq("id", pageId).eq("tenant_id", tenantUuid);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing_pages", tenantUuid] });
      toast({ title: "Page Deleted" });
    },
  });

  const stats = {
    total: pages.length,
    published: pages.filter((p: any) => p.status === "published").length,
    totalViews: pages.reduce((sum: number, p: any) => sum + (p.views || 0), 0),
    totalConversions: pages.reduce((sum: number, p: any) => sum + (p.conversions || 0), 0),
  };

  return { pages, isLoading, stats, createPage, publishPage, deletePage };
}
