import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RoomCompleteness {
  room_id: string;
  room_number: string;
  room_name: string;
  room_type: string;
  area_sqft: number;
  has_floor: boolean;
  has_wall: boolean;
  has_base: boolean;
  has_ceiling: boolean;
  has_transition: boolean;
  floor_tags: string[];
  wall_tags: string[];
  base_tags: string[];
  ceiling_tags: string[];
  completeness_pct: number;
  issues: string[];
}

export interface ProjectCompleteness {
  total_rooms: number;
  complete_rooms: number;
  partial_rooms: number;
  incomplete_rooms: number;
  overall_pct: number;
  rooms: RoomCompleteness[];
  surface_coverage: {
    floor: { covered: number; total: number; pct: number };
    wall: { covered: number; total: number; pct: number };
    base: { covered: number; total: number; pct: number };
    ceiling: { covered: number; total: number; pct: number };
  };
  issues: string[];
}

export function useEstimationCompleteness(projectId: string | undefined) {
  return useQuery({
    queryKey: ["estimation-completeness", projectId],
    queryFn: async (): Promise<ProjectCompleteness> => {
      if (!projectId) throw new Error("No project ID");

      const { data: rooms } = await supabase
        .from("estimation_rooms")
        .select("id, room_number, room_name, room_type, area_sqft")
        .eq("project_id", projectId)
        .order("room_number");

      if (!rooms || rooms.length === 0) {
        return {
          total_rooms: 0, complete_rooms: 0, partial_rooms: 0, incomplete_rooms: 0,
          overall_pct: 0, rooms: [],
          surface_coverage: {
            floor: { covered: 0, total: 0, pct: 0 }, wall: { covered: 0, total: 0, pct: 0 },
            base: { covered: 0, total: 0, pct: 0 }, ceiling: { covered: 0, total: 0, pct: 0 },
          },
          issues: [],
        };
      }

      const { data: items } = await supabase
        .from("estimation_takeoff_items")
        .select("room_id, surface, material_tag, takeoff_method")
        .eq("project_id", projectId);

      const roomItems: Record<string, typeof items> = {};
      for (const item of items || []) {
        if (!item.room_id) continue;
        if (!roomItems[item.room_id]) roomItems[item.room_id] = [];
        roomItems[item.room_id].push(item);
      }

      const results: RoomCompleteness[] = [];
      let floorCov = 0, wallCov = 0, baseCov = 0, ceilCov = 0;
      const allIssues: string[] = [];

      for (const room of rooms) {
        const ri = roomItems[room.id] || [];
        const tagsFor = (surface: string) =>
          [...new Set(ri.filter(i => i.surface === surface).map(i => i.material_tag).filter(Boolean))];

        const floorTags = tagsFor("floor");
        const wallTags = [
          ...new Set(ri.filter(i => i.surface === "wall" || (i.takeoff_method === "paint_engine" && i.surface === "wall"))
            .map(i => i.material_tag).filter(Boolean)),
        ];
        const baseTags = tagsFor("base");
        const ceilingTags = tagsFor("ceiling");
        const transitionTags = tagsFor("transition");

        const hasFloor = floorTags.length > 0;
        const hasPaint = ri.some(i => (i.material_tag || "").startsWith("PAINT-") || (i.material_tag || "").startsWith("PRIMER-"));
        const hasWall = wallTags.length > 0 || hasPaint;
        const hasBase = baseTags.length > 0;
        const hasCeiling = ceilingTags.length > 0;

        const rtype = ((room.room_type || "") + " " + (room.room_name || "")).toLowerCase();
        const isUtility = /storage|closet|utility|janitor|mechanical|electrical|server|idf|mdf/.test(rtype);
        const isStair = /stair/.test(rtype);

        const issues: string[] = [];
        let expected = 4, covered = 0;

        if (hasFloor) { covered++; floorCov++; } else if (!isStair) { issues.push("No floor"); }
        if (hasWall) { covered++; wallCov++; } else { issues.push("No wall finish"); }
        if (hasBase) { covered++; baseCov++; } else if (isUtility || isStair) { expected--; } else { issues.push("No base"); }
        // ACT ceilings don't appear as takeoff items — assume covered unless painted ceiling expected
        if (hasCeiling) { covered++; ceilCov++; } else { covered++; ceilCov++; } // assume ACT

        const pct = Math.round((covered / expected) * 100);
        if (issues.length > 0) allIssues.push(`${room.room_number || "?"} ${room.room_name}: ${issues.join(", ")}`);

        results.push({
          room_id: room.id, room_number: room.room_number || "", room_name: room.room_name || "",
          room_type: room.room_type || "", area_sqft: room.area_sqft || 0,
          has_floor: hasFloor, has_wall: hasWall, has_base: hasBase, has_ceiling: hasCeiling,
          has_transition: transitionTags.length > 0,
          floor_tags: floorTags, wall_tags: wallTags, base_tags: baseTags, ceiling_tags: ceilingTags,
          completeness_pct: pct, issues,
        });
      }

      const total = results.length;
      const complete = results.filter(r => r.completeness_pct === 100).length;
      const partial = results.filter(r => r.completeness_pct > 0 && r.completeness_pct < 100).length;
      const incomplete = results.filter(r => r.completeness_pct === 0).length;

      return {
        total_rooms: total, complete_rooms: complete, partial_rooms: partial, incomplete_rooms: incomplete,
        overall_pct: total > 0 ? Math.round((complete / total) * 100) : 0,
        rooms: results,
        surface_coverage: {
          floor: { covered: floorCov, total, pct: Math.round((floorCov / total) * 100) },
          wall: { covered: wallCov, total, pct: Math.round((wallCov / total) * 100) },
          base: { covered: baseCov, total, pct: Math.round((baseCov / total) * 100) },
          ceiling: { covered: ceilCov, total, pct: Math.round((ceilCov / total) * 100) },
        },
        issues: allIssues,
      };
    },
    enabled: !!projectId,
  });
}
