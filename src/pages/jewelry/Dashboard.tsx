/**
 * Jewelry Command Center (Project JX, Phase 4).
 * Read-only overview for a jewelry tenant. Mirrors the clinic dashboard's shadcn/Card
 * layout so it looks native. Handles empty/fresh-tenant state gracefully (0 / "no data
 * yet", never crashes). Reads via useJewelry hooks (RLS + slug).
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Scale, Banknote, PackageCheck, Sparkles, AlertTriangle } from "lucide-react";
import {
  JX_KARATS, useJewelrySetting, useGoldRates, useGoldPosition, useCashToday, useOrdersDue,
} from "@/hooks/useJewelry";

const GOLD = "#C9A227";

export default function JewelryDashboard() {
  const { currency } = useJewelrySetting();
  const { latestByKarat, hasPlaceholder, anyRealRate, isLoading: ratesLoading } = useGoldRates();
  const { byKarat: positionByKarat, totalFine, hasRows: hasLedger, isLoading: posLoading } = useGoldPosition();
  const { cashToday, salesToday, isLoading: cashLoading } = useCashToday();
  const { ordersDue, isLoading: ordersLoading } = useOrdersDue();

  const money = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-7 w-7" style={{ color: GOLD }} />
            Command Center
          </h1>
          <p className="text-muted-foreground">Legacy Jewellers — live shop overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline"><Link to="/jewelry/reports">Reports</Link></Button>
          <Button asChild variant="outline"><Link to="/jewelry/gold-rate">Set Gold Rate</Link></Button>
        </div>
      </div>

      {/* Placeholder-rate banner: never present a placeholder as a real rate */}
      {!ratesLoading && hasPlaceholder && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              Your gold rates are still <strong>placeholders</strong>, not real market rates.{" "}
              <Link to="/jewelry/gold-rate" className="underline font-medium">Set today’s rate</Link> to start billing accurately.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Gold Position */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gold Position</CardTitle>
            <Scale className="h-4 w-4" style={{ color: GOLD }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{posLoading ? "—" : `${totalFine.toLocaleString(undefined, { maximumFractionDigits: 3 })} g`}</div>
            <p className="text-xs text-muted-foreground">
              {hasLedger
                ? JX_KARATS.filter((k) => positionByKarat[k]).map((k) => `${k}K ${(positionByKarat[k]).toFixed(3)}g`).join(" · ") || "fine gold"
                : "No gold movements yet"}
            </p>
            <p className="text-xs mt-2" style={{ color: GOLD }}>Live fine-gold position in grams — not just rupees.</p>
          </CardContent>
        </Card>

        {/* Today's Gold Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today’s Gold Rate</CardTitle>
            <Banknote className="h-4 w-4" style={{ color: GOLD }} />
          </CardHeader>
          <CardContent>
            {ratesLoading ? (
              <div className="text-2xl font-bold">—</div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {latestByKarat[22]?.rate_per_gram != null ? money(Number(latestByKarat[22].rate_per_gram)) : "—"}
                  <span className="text-sm font-normal text-muted-foreground"> /g · 22K</span>
                </div>
                {hasPlaceholder ? (
                  <Badge variant="outline" className="mt-1 border-amber-400 text-amber-700">Placeholder — not real yet</Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">{anyRealRate ? "Manual rate set" : ""}</p>
                )}
              </>
            )}
            <p className="text-xs mt-2" style={{ color: GOLD }}>Your rates drive every bill instantly.</p>
          </CardContent>
        </Card>

        {/* Cash Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Today</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cashLoading ? "—" : money(cashToday)}</div>
            <p className="text-xs text-muted-foreground">{salesToday > 0 ? `${salesToday} sale(s) today` : "No sales yet today"}</p>
            <p className="text-xs mt-2" style={{ color: GOLD }}>Counter cash, reconciled the moment a bill is saved.</p>
          </CardContent>
        </Card>

        {/* Orders Due */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Due</CardTitle>
            <PackageCheck className="h-4 w-4" style={{ color: GOLD }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ordersLoading ? "—" : ordersDue}</div>
            <p className="text-xs text-muted-foreground">{ordersDue > 0 ? "Custom orders awaiting delivery" : "No pending orders"}</p>
            <p className="text-xs mt-2" style={{ color: GOLD }}>Bespoke orders tracked from advance to delivery.</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Feed (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: GOLD }} />
            Agent Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Your AI shop agent will post here — rate-change nudges, slow-moving stock, karigar dues, and order
            follow-ups. Coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
