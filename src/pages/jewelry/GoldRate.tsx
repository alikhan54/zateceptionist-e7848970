/**
 * Gold Rate page (Project JX, Phase 4).
 * Manual entry/edit of the per-gram rate for 24/22/21/18; per-tola is computed live
 * from calc.ts (per-tola = per-gram × grams/tola). Save upserts jx_gold_rate with
 * source='manual', effective_at=now — replacing the placeholder rows so the shop bills
 * accurately from day one. Reuses calc.ts (no re-implemented math).
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Scale, Save, Loader2 } from "lucide-react";
import { JX_KARATS, useGoldRates, useJewelrySetting } from "@/hooks/useJewelry";
import { tolaToGrams, round2 } from "@/lib/jewelry/calc";

const GOLD = "#C9A227";

export default function GoldRate() {
  const { currency } = useJewelrySetting();
  const { latestByKarat, tolaGrams, isLoading, saveRates } = useGoldRates();
  const { toast } = useToast();
  const [perGram, setPerGram] = useState<Record<number, string>>({ 24: "", 22: "", 21: "", 18: "" });

  // Populate inputs from current rates once loaded (placeholders shown but flagged).
  useEffect(() => {
    const next: Record<number, string> = { 24: "", 22: "", 21: "", 18: "" };
    for (const k of JX_KARATS) {
      const r = latestByKarat[k];
      if (r?.rate_per_gram != null) next[k] = String(r.rate_per_gram);
    }
    setPerGram(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestByKarat[24]?.id, latestByKarat[22]?.id, latestByKarat[21]?.id, latestByKarat[18]?.id,
      latestByKarat[24]?.rate_per_gram, latestByKarat[22]?.rate_per_gram, latestByKarat[21]?.rate_per_gram, latestByKarat[18]?.rate_per_gram]);

  const perTola = (k: number): string => {
    const v = parseFloat(perGram[k]);
    if (Number.isNaN(v)) return "—";
    return round2(tolaToGrams(v, tolaGrams)).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const onSave = async () => {
    const payload: Record<number, number> = {};
    for (const k of JX_KARATS) {
      const v = parseFloat(perGram[k]);
      if (!Number.isNaN(v) && v > 0) payload[k] = v;
    }
    if (Object.keys(payload).length === 0) {
      toast({ title: "Enter a rate", description: "Enter at least one per-gram rate.", variant: "destructive" });
      return;
    }
    try {
      await saveRates.mutateAsync(payload);
      toast({ title: "Gold rates saved", description: "Today’s rates are live — bills now use these." });
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Scale className="h-7 w-7" style={{ color: GOLD }} />
          Gold Rate
        </h1>
        <p className="text-muted-foreground">Set today’s {currency} rate per gram. Per-tola (1 tola = {tolaGrams} g) is computed for you.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today’s Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JX_KARATS.map((k) => {
              const src = latestByKarat[k]?.source;
              return (
                <div key={k} className="rounded-lg border p-4 space-y-2" style={{ borderColor: "rgba(201,160,39,0.35)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">{k}K</span>
                    {src === "placeholder" && <Badge variant="outline" className="border-amber-400 text-amber-700">placeholder</Badge>}
                    {src === "manual" && <Badge variant="outline" className="border-green-500 text-green-700">manual</Badge>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`rate-${k}`} className="text-xs text-muted-foreground">Rate per gram ({currency})</Label>
                    <Input
                      id={`rate-${k}`}
                      inputMode="decimal"
                      type="number"
                      min="0"
                      value={perGram[k]}
                      onChange={(e) => setPerGram((p) => ({ ...p, [k]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Per tola: <span className="font-medium text-foreground">{currency} {perTola(k)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={onSave} disabled={saveRates.isPending || isLoading} style={{ backgroundColor: GOLD }} className="text-black hover:opacity-90">
              {saveRates.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Rates
            </Button>
            <span className="text-xs text-muted-foreground">Saved rates apply to all new bills immediately.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
