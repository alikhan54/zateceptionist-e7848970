import { useEstimationCompleteness } from "@/hooks/useEstimationCompleteness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

function SurfaceBar({ label, covered, total }: { label: string; covered: number; total: number }) {
  const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : pct >= 75 ? "bg-yellow-500" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-medium">{pct}%</span>
    </div>
  );
}

function CellBadge({ has, tags }: { has: boolean; tags: string[] }) {
  if (has && tags.length > 0) {
    return <Badge className="bg-green-100 text-green-800 text-[10px] font-normal">{tags[0]}{tags.length > 1 ? ` +${tags.length - 1}` : ""}</Badge>;
  }
  if (has) {
    return <Badge className="bg-green-100 text-green-800 text-[10px]">OK</Badge>;
  }
  return <Badge variant="destructive" className="text-[10px] font-normal">NONE</Badge>;
}

export default function CompletenessGrid({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useEstimationCompleteness(projectId);

  if (isLoading) return <Card><CardContent className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading completeness data...</CardContent></Card>;
  if (error || !data) return <Card><CardContent className="py-8 text-center text-muted-foreground">Could not load completeness data.</CardContent></Card>;
  if (data.total_rooms === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground">No rooms in project yet.</CardContent></Card>;

  const sc = data.surface_coverage;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Room-Material Completeness
            </CardTitle>
            <Badge variant={data.overall_pct === 100 ? "default" : "secondary"} className="text-sm">
              {data.complete_rooms}/{data.total_rooms} rooms complete ({data.overall_pct}%)
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <SurfaceBar label="Floor" covered={sc.floor.covered} total={sc.floor.total} />
          <SurfaceBar label="Wall" covered={sc.wall.covered} total={sc.wall.total} />
          <SurfaceBar label="Base" covered={sc.base.covered} total={sc.base.total} />
          <SurfaceBar label="Ceiling" covered={sc.ceiling.covered} total={sc.ceiling.total} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left">Room</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-right">SF</th>
                  <th className="p-2 text-center">Floor</th>
                  <th className="p-2 text-center">Wall</th>
                  <th className="p-2 text-center">Base</th>
                  <th className="p-2 text-center">Ceiling</th>
                  <th className="p-2 text-center">Trans.</th>
                  <th className="p-2 text-left">Issues</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map(r => (
                  <tr key={r.room_id} className={`border-b hover:bg-muted/30 ${r.issues.length > 0 ? "bg-red-50/30" : ""}`}>
                    <td className="p-2 font-medium">{r.room_number} {r.room_name}</td>
                    <td className="p-2 text-muted-foreground">{r.room_type}</td>
                    <td className="p-2 text-right">{r.area_sqft ? Math.round(r.area_sqft).toLocaleString() : "—"}</td>
                    <td className="p-2 text-center"><CellBadge has={r.has_floor} tags={r.floor_tags} /></td>
                    <td className="p-2 text-center"><CellBadge has={r.has_wall} tags={r.wall_tags} /></td>
                    <td className="p-2 text-center"><CellBadge has={r.has_base} tags={r.base_tags} /></td>
                    <td className="p-2 text-center"><CellBadge has={r.has_ceiling} tags={r.ceiling_tags} /></td>
                    <td className="p-2 text-center">{r.has_transition ? <Badge className="bg-green-100 text-green-800 text-[10px]">TS</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="p-2 text-muted-foreground">{r.issues.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {data.issues.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" /> Issues ({data.issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {data.issues.map((issue, i) => <li key={i}>{issue}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
