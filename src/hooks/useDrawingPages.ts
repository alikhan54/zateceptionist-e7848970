import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface DrawingPage {
  id: string;
  tenant_id: string;
  project_id: string;
  page_number: number;
  page_type: string | null;
  sheet_number: string | null;
  sheet_title: string | null;
  classification_confidence: number | null;
  rooms_detected: number | null;
  room_detection_status: string | null;
  markup_url: string | null;
  processing_status: string | null;
  text_blocks_count: number | null;
  qa_flags: {
    chosen_scale?: number | null;
    confidence?: string;
    flags?: string[];
    labels_on_page?: number;
    area_median_after?: number | null;
    spatial_materials?: {
      rooms_tagged: number;
      tags_assigned: number;
      tags_unassigned: number;
      at?: string;
    } | null;
  } | null;
}

export interface DrawingRoom {
  id: string;
  page_number: number;
  room_name: string | null;
  room_number: string | null;
  area_sqft: number | null;
}

/** Page types the dissector can measure (vector room detection + markup). */
export const PLAN_TYPES = ["floor_plan", "finish_plan", "reflected_ceiling_plan"];

/**
 * Dissected drawing pages for a project (estimation_drawing_pages, SLUG tenant).
 * NOTE: vector_data is deliberately NOT selected — it can be multi-MB per page.
 */
export function useDrawingPages(projectId?: string, opts?: { poll?: boolean }) {
  const { tenantId } = useTenant();

  const { data: pages = [], isLoading, refetch } = useQuery({
    queryKey: ["estimation_drawing_pages", tenantId, projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_drawing_pages" as any)
        .select("id,tenant_id,project_id,page_number,page_type,sheet_number,sheet_title,classification_confidence,rooms_detected,room_detection_status,markup_url,processing_status,text_blocks_count,qa_flags")
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .order("page_number");
      if (error) throw error;
      return (data || []) as unknown as DrawingPage[];
    },
    enabled: !!tenantId && !!projectId,
    refetchInterval: opts?.poll ? 5000 : false,
  });

  return { pages, isLoading, refetch };
}

/** Detected rooms for one page (estimation_room_polygons). Enabled only when pageNumber is set. */
export function useDrawingRooms(projectId?: string, pageNumber?: number) {
  const { tenantId } = useTenant();

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["estimation_room_polygons", tenantId, projectId, pageNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_room_polygons" as any)
        .select("id,page_number,room_name,room_number,area_sqft")
        .eq("tenant_id", tenantId)
        .eq("project_id", projectId)
        .eq("page_number", pageNumber)
        .order("area_sqft", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DrawingRoom[];
    },
    enabled: !!tenantId && !!projectId && pageNumber != null,
  });

  return { rooms, isLoading };
}
