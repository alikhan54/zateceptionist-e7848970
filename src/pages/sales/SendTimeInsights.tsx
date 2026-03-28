import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2 } from "lucide-react";
import { FeatureBanner } from "@/components/FeatureBanner";

interface SendTimePref {
  id: string; recipient_email: string; best_day_of_week?: string; best_hour_utc?: number;
  best_hour_local?: number; estimated_timezone?: string; total_opens: number;
  total_sent: number; confidence: number; opens_by_hour: Record<string, number>;
  opens_by_day: Record<string, number>;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SendTimeInsights() {
  const { tenantId } = useTenant();

  const { data: prefs = [], isLoading } = useQuery({
    queryKey: ["send_time_preferences", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("send_time_preferences").select("*").eq("tenant_id", tenantId).order("confidence", { ascending: false });
      if (error) throw error;
      return (data || []) as SendTimePref[];
    },
    enabled: !!tenantId,
  });

  // Aggregate heatmap data
  const heatmap: Record<string, Record<number, number>> = {};
  DAYS.forEach(d => { heatmap[d] = {}; HOURS.forEach(h => { heatmap[d][h] = 0; }); });
  prefs.forEach(p => {
    if (p.opens_by_day && p.opens_by_hour) {
      Object.entries(p.opens_by_hour).forEach(([h, c]) => {
        Object.entries(p.opens_by_day).forEach(([d, dc]) => {
          if (heatmap[d]) heatmap[d][parseInt(h)] = (heatmap[d][parseInt(h)] || 0) + (c as number);
        });
      });
    }
  });
  const maxVal = Math.max(1, ...Object.values(heatmap).flatMap(d => Object.values(d)));

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold flex items-center gap-2"><Clock className="h-8 w-8" /> Send Time Insights</h1>
      <p className="text-muted-foreground mt-1">Optimal send times learned from engagement patterns</p></div>

      <FeatureBanner icon={Clock} title="AI Send Time Optimization" description="Analyzes when recipients open emails and schedules sends at optimal times." />

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{prefs.length}</div><div className="text-xs text-muted-foreground">Recipients Analyzed</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-400">{prefs.filter(p => p.confidence >= 0.5).length}</div><div className="text-xs text-muted-foreground">High Confidence</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{prefs.reduce((s, p) => s + p.total_opens, 0)}</div><div className="text-xs text-muted-foreground">Total Opens Tracked</div></CardContent></Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Engagement Heatmap (Hour x Day)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="flex gap-0.5 mb-1">
                <div className="w-20" />
                {HOURS.filter(h => h % 3 === 0).map(h => (
                  <div key={h} className="flex-1 text-center text-xs text-muted-foreground">{h}:00</div>
                ))}
              </div>
              {DAYS.map(day => (
                <div key={day} className="flex gap-0.5 mb-0.5">
                  <div className="w-20 text-xs text-muted-foreground capitalize flex items-center">{day.slice(0, 3)}</div>
                  {HOURS.map(h => {
                    const val = heatmap[day]?.[h] || 0;
                    const intensity = val / maxVal;
                    return (
                      <div key={h} className="flex-1 h-6 rounded-sm transition-colors" title={`${day} ${h}:00 — ${val} opens`}
                        style={{ backgroundColor: val > 0 ? `rgba(139, 92, 246, ${0.15 + intensity * 0.85})` : 'rgba(255,255,255,0.03)' }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recipient Preferences</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {prefs.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <div className="font-medium text-sm">{p.recipient_email}</div>
                  <div className="text-xs text-muted-foreground">{p.estimated_timezone || 'UTC'}</div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">{p.best_day_of_week}</Badge>
                  <Badge variant="outline">{p.best_hour_utc}:00 UTC</Badge>
                  <div className="w-16 text-right"><span className={p.confidence >= 0.5 ? 'text-green-400' : 'text-yellow-400'}>{Math.round(p.confidence * 100)}%</span></div>
                  <div className="text-xs text-muted-foreground">{p.total_opens} opens</div>
                </div>
              </div>
            ))}
            {prefs.length === 0 && <div className="text-center py-8 text-muted-foreground">No send time data yet. Data accumulates as recipients open emails.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
