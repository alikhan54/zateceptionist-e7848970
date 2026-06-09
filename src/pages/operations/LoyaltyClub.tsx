import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Crown, Medal, Star, TrendingUp, Clock, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LoyaltyMember {
  id: string;
  customer_id: string;
  points_balance: number;
  tier: string;
  total_points_earned: number;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
}

const TIER_STYLE: Record<string, { badge: string; icon: JSX.Element; ring: string }> = {
  Platinum: { badge: "bg-violet-100 text-violet-700 border-violet-300", icon: <Crown className="h-4 w-4 text-violet-600" />, ring: "border-l-violet-500" },
  Gold:     { badge: "bg-amber-100 text-amber-700 border-amber-300",  icon: <Medal className="h-4 w-4 text-amber-600" />,  ring: "border-l-amber-500" },
  Silver:   { badge: "bg-slate-100 text-slate-700 border-slate-300",  icon: <Star className="h-4 w-4 text-slate-500" />,   ring: "border-l-slate-400" },
};

export default function LoyaltyClub() {
  const { tenantConfig, tenantId } = useTenant();
  const { formatPrice } = useCurrency();

  // loyalty rows + the customer names (loyalty.customer_id → customers.id)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["loyalty_members", tenantId],
    queryFn: async (): Promise<Array<LoyaltyMember & { name: string; phone: string | null }>> => {
      if (!tenantId) return [];
      const { data: loyalty } = await supabase
        .from("customer_loyalty")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("total_points_earned", { ascending: false })
        .limit(500);
      if (!loyalty || loyalty.length === 0) return [];
      const ids = loyalty.map((l: any) => l.customer_id).filter(Boolean);
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, phone_number")
        .in("id", ids);
      const byId: Record<string, any> = {};
      for (const c of customers || []) byId[c.id] = c;
      return loyalty.map((l: any) => ({
        ...l,
        name: byId[l.customer_id]?.name || "Guest",
        phone: byId[l.customer_id]?.phone || byId[l.customer_id]?.phone_number || null,
      }));
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    const total = members.length;
    const platinum = members.filter((m) => m.tier === "Platinum").length;
    const gold = members.filter((m) => m.tier === "Gold").length;
    const silver = members.filter((m) => m.tier === "Silver").length;
    const lapsed = members.filter((m) => m.last_order_at && (Date.now() - new Date(m.last_order_at).getTime()) > 90 * 864e5).length;
    const totalPoints = members.reduce((s, m) => s + (m.points_balance || 0), 0);
    const totalSpent = members.reduce((s, m) => s + Number(m.total_spent || 0), 0);
    return { total, platinum, gold, silver, lapsed, totalPoints, totalSpent };
  }, [members]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="h-6 w-6 text-amber-500" /> BBQ Tonight Club</h1>
          <p className="text-muted-foreground">Loyalty members, tiers & points — earn on every order</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold flex items-center justify-center gap-1"><Users className="h-4 w-4 text-muted-foreground" />{stats.total}</p>
          <p className="text-xs text-muted-foreground">Members</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-violet-600 flex items-center justify-center gap-1"><Crown className="h-4 w-4" />{stats.platinum}</p>
          <p className="text-xs text-muted-foreground">Platinum</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-amber-600 flex items-center justify-center gap-1"><Medal className="h-4 w-4" />{stats.gold}</p>
          <p className="text-xs text-muted-foreground">Gold</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Points Outstanding</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{stats.lapsed}</p>
          <p className="text-xs text-muted-foreground">Lapsed (90d+)</p>
        </CardContent></Card>
      </div>

      {/* Member list */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Members by lifetime points</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading members…</p>
          ) : members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Award className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No members yet. Points are awarded automatically when a customer places an order.</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="loyalty-member-list">
              {members.map((m) => {
                const style = TIER_STYLE[m.tier] || TIER_STYLE.Silver;
                const lapsed = m.last_order_at && (Date.now() - new Date(m.last_order_at).getTime()) > 90 * 864e5;
                return (
                  <div key={m.id} data-testid={`loyalty-row-${m.customer_id}`} className={`flex items-center justify-between gap-3 p-3 rounded-lg border border-l-4 ${style.ring} bg-card`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0">{style.icon}</div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.phone || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">Spent</p>
                        <p className="text-sm font-medium">{formatPrice(Number(m.total_spent || 0))}</p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">Orders</p>
                        <p className="text-sm font-medium">{m.total_orders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Points</p>
                        <p className="text-sm font-bold" data-testid={`loyalty-points-${m.customer_id}`}>{m.points_balance.toLocaleString()}</p>
                      </div>
                      <div className="w-24 text-right">
                        <Badge variant="outline" className={`${style.badge} text-xs`} data-testid={`loyalty-tier-${m.customer_id}`}>{m.tier}</Badge>
                        {lapsed && <p className="text-[10px] text-red-500 mt-1">lapsed {m.last_order_at ? formatDistanceToNow(new Date(m.last_order_at), { addSuffix: true }) : ""}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
