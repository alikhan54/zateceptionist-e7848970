import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  Search,
  DollarSign,
  Clock,
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  Truck,
  UtensilsCrossed,
  Phone,
} from "lucide-react";
import {
  useRestaurantOrders,
  type RestaurantOrder,
} from "@/hooks/useRestaurantOrders";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "completed", label: "Completed" },
];

const STATUS_BADGE: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", label: "Pending" },
  confirmed: { className: "bg-blue-500/10 text-blue-600 border-blue-500/30", label: "Confirmed" },
  preparing: { className: "bg-purple-500/10 text-purple-600 border-purple-500/30", label: "Preparing" },
  ready: { className: "bg-green-500/10 text-green-600 border-green-500/30", label: "Ready" },
  dispatched: { className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30", label: "Dispatched" },
  delivered: { className: "bg-teal-500/10 text-teal-600 border-teal-500/30", label: "Delivered" },
  completed: { className: "bg-gray-500/10 text-gray-600 border-gray-500/30", label: "Completed" },
  cancelled: { className: "bg-red-500/10 text-red-600 border-red-500/30", label: "Cancelled" },
};

const ORDER_TYPE_ICON: Record<string, React.ReactNode> = {
  delivery: <Truck className="h-3 w-3" />,
  pickup: <Package className="h-3 w-3" />,
  dine_in: <UtensilsCrossed className="h-3 w-3" />,
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { orders, isLoading, stats, updateStatus } = useRestaurantOrders(
    statusFilter === "all" ? undefined : statusFilter
  );

  const filteredOrders = searchTerm
    ? orders.filter(
        (o) =>
          o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.order_number?.toString().includes(searchTerm) ||
          o.customer_phone?.includes(searchTerm)
      )
    : orders;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
    } catch {
      // Error handling
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage restaurant orders</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.totalToday}</p>
            <p className="text-sm text-muted-foreground">Orders Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.revenueToday.toFixed(0)} AED
            </p>
            <p className="text-sm text-muted-foreground">Revenue Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.preparing}</p>
            <p className="text-sm text-muted-foreground">Preparing</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={statusFilter === tab.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusCfg = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
            const itemsSummary = (order.items || [])
              .map((i) => `${i.quantity}x ${i.name}`)
              .join(", ");

            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center min-w-[70px]">
                        <p className="text-lg font-bold">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(order.created_at)}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{order.customer_name}</p>
                          <Badge variant="outline" className={statusCfg.className}>
                            {statusCfg.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {ORDER_TYPE_ICON[order.order_type]}
                            {order.order_type === "delivery"
                              ? "Delivery"
                              : order.order_type === "pickup"
                              ? "Pickup"
                              : "Dine-in"}
                          </Badge>
                          {order.source === "phone" && (
                            <Badge variant="outline" className="text-xs">
                              <Phone className="h-3 w-3 mr-1" /> Voice
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {itemsSummary}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="font-medium">
                            {order.total} {order.currency || "AED"}
                          </span>
                          <span className="text-muted-foreground">
                            {order.payment_method === "cash" ? "Cash" : "Card"}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              order.payment_status === "paid"
                                ? "text-green-600 border-green-500/30"
                                : "text-yellow-600 border-yellow-500/30"
                            }
                          >
                            {order.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 ml-4">
                      {order.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, "confirmed")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, "preparing")}
                        >
                          Start Prep
                        </Button>
                      )}
                      {order.status === "ready" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(
                              order.id,
                              order.order_type === "delivery" ? "dispatched" : "completed"
                            )
                          }
                        >
                          {order.order_type === "delivery" ? "Dispatch" : "Complete"}
                        </Button>
                      )}
                      {order.status === "dispatched" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, "delivered")}
                        >
                          Delivered
                        </Button>
                      )}
                      {(order.status === "pending" || order.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleStatusUpdate(order.id, "cancelled")}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
