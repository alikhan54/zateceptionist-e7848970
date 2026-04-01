import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FloorPlanRoom {
  id: string;
  room_number: string;
  room_name: string;
  room_type: string;
  area_sqft: number;
  perimeter_lf: number;
  estLength: number;
  estWidth: number;
  floorTag: string;
  wallTags: string[];
  baseTag: string;
  ceilTag: string;
  hasMissing: boolean;
  measured_by: string;
}

function estimateDims(area: number, perim: number) {
  if (!area || area <= 0) return { length: 10, width: 10 };
  if (!perim || perim <= 0) {
    const s = Math.sqrt(area);
    return { length: s, width: s };
  }
  const hp = perim / 2;
  const disc = hp * hp - 4 * area;
  if (disc < 0) {
    const s = Math.sqrt(area);
    return { length: s, width: s };
  }
  const sq = Math.sqrt(disc);
  return {
    length: Math.round(Math.max((hp + sq) / 2, (hp - sq) / 2) * 10) / 10,
    width: Math.round(Math.min((hp + sq) / 2, (hp - sq) / 2) * 10) / 10,
  };
}

export function useFloorPlanData(projectId: string | undefined) {
  return useQuery({
    queryKey: ["floor-plan-data", projectId],
    queryFn: async (): Promise<FloorPlanRoom[]> => {
      if (!projectId) return [];

      const { data: rooms } = await supabase
        .from("estimation_rooms")
        .select("id, room_number, room_name, room_type, area_sqft, perimeter_lf, length_ft, width_ft, measured_by")
        .eq("project_id", projectId)
        .order("room_number");

      const { data: items } = await supabase
        .from("estimation_takeoff_items")
        .select("room_id, surface, material_tag, takeoff_method")
        .eq("project_id", projectId);

      if (!rooms) return [];

      const roomItems: Record<string, typeof items> = {};
      for (const it of items || []) {
        if (!it.room_id) continue;
        if (!roomItems[it.room_id]) roomItems[it.room_id] = [];
        roomItems[it.room_id].push(it);
      }

      return rooms.map((r: any) => {
        const ri = roomItems[r.id] || [];
        const tagsFor = (s: string) => [...new Set(ri.filter((i: any) => i.surface === s).map((i: any) => i.material_tag).filter(Boolean))];
        const floorTags = tagsFor("floor");
        const wallTags = [...new Set(ri.filter((i: any) => i.surface === "wall" || i.takeoff_method === "paint_engine").map((i: any) => i.material_tag).filter(Boolean))];
        const baseTags = tagsFor("base");
        const ceilTags = tagsFor("ceiling");
        const area = r.area_sqft || 0;
        const perim = r.perimeter_lf || 0;
        const dims = r.length_ft && r.width_ft
          ? { length: r.length_ft, width: r.width_ft }
          : estimateDims(area, perim);

        const rtype = ((r.room_type || "") + " " + (r.room_name || "")).toLowerCase();
        const isUtility = /storage|closet|utility|janitor|mechanical|electrical|server|idf|mdf|stair/.test(rtype);
        const hasFloor = floorTags.length > 0;
        const hasWall = wallTags.length > 0;
        const hasBase = baseTags.length > 0;
        const hasMissing = (!hasFloor && !isUtility) || !hasWall || (!hasBase && !isUtility);

        return {
          id: r.id,
          room_number: r.room_number || "",
          room_name: r.room_name || "",
          room_type: r.room_type || "",
          area_sqft: area,
          perimeter_lf: perim,
          estLength: dims.length,
          estWidth: dims.width,
          floorTag: floorTags[0] || "",
          wallTags,
          baseTag: baseTags[0] || "",
          ceilTag: ceilTags[0] || "",
          hasMissing,
          measured_by: r.measured_by || "",
        };
      });
    },
    enabled: !!projectId,
  });
}
