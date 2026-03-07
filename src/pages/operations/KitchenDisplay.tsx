import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  Clock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Play,
  CheckCircle,
  UtensilsCrossed,
} from "lucide-react";
import { useKitchenDisplay } from "@/hooks/useKitchenDisplay";
import { cn } from "@/lib/utils";

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function getTimerColor(minutes: number): string {
  if (minutes < 15) return "text-green-600";
  if (minutes < 25) return "text-yellow-600";
  return "text-red-600";
}

function getTimerBg(minutes: number): string {
  if (minutes < 15) return "bg-green-500/10 border-green-500/30";
  if (minutes < 25) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

export default function KitchenDisplay() {
  const { pending, preparing, isLoading, refetch, startPreparation, markReady } =
    useKitchenDisplay();
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const OrderCard = ({
    order,
    actions,
  }: {
    order: any;
    actions: React.ReactNode;
  }) => {
    const elapsed = getElapsedMinutes(order.created_at);
    const timerColor = getTimerColor(elapsed);
    const timerBg = getTimerBg(elapsed);

    return (
      <Card className={cn("border", timerBg)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">#{order.order_number || "?"}</span>
              <Badge variant="outline" className="text-xs">
                {order.order_type === "delivery"
                  ? "Delivery"
                  : order.order_type === "pickup"
                  ? "Pickup"
                  : "Dine-in"}
              </Badge>
            </div>
            <div className={cn("flex items-center gap-1 font-mono font-bold", timerColor)}>
              <Clock className="h-4 w-4" />
              {elapsed}m
            </div>
          </div>

          {order.customer_name && (
            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
          )}

          <div className="space-y-1">
            {(order.items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span>
                  {item.quantity}x {item.name}
                </span>
                {item.special_instructions && (
                  <span className="text-xs text-orange-600 italic ml-2 truncate max-w-[120px]">
                    {item.special_instructions}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2">{actions}</div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-4", fullscreen && "p-4 bg-background min-h-screen")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Kitchen Display</h1>
            <p className="text-sm text-muted-foreground">
              {pending.length + preparing.length} active orders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading kitchen orders...</div>
      ) : pending.length === 0 && preparing.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UtensilsCrossed className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No active orders</p>
          <p className="text-sm">New orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PENDING Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <h2 className="font-semibold text-lg">PENDING</h2>
              <Badge variant="secondary">{pending.length}</Badge>
            </div>
            {pending.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No pending orders
                </CardContent>
              </Card>
            ) : (
              pending.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  actions={
                    <Button
                      className="w-full"
                      onClick={() => startPreparation.mutate(order.id)}
                      disabled={startPreparation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" /> Start Preparing
                    </Button>
                  }
                />
              ))
            )}
          </div>

          {/* PREPARING Column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="font-semibold text-lg">PREPARING</h2>
              <Badge variant="secondary">{preparing.length}</Badge>
            </div>
            {preparing.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground text-sm">
                  No orders in preparation
                </CardContent>
              </Card>
            ) : (
              preparing.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  actions={
                    <Button
                      variant="default"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => markReady.mutate(order.id)}
                      disabled={markReady.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark Ready
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
