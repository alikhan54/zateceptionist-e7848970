import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Search,
  FileText,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Package,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "pending_approval", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  pending_approval: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  approved: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  sent: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30",
  delivered: "bg-green-500/10 text-green-600 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/30",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  pending_approval: <Clock className="h-3 w-3" />,
  approved: <CheckCircle2 className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  delivered: <Package className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
};

export default function PurchaseOrders() {
  const { tenantConfig } = useTenant();
  const tenantSlug = tenantConfig?.tenant_id || "zateceptionist";
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["ops_purchase_orders", tenantSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("ops_purchase_orders")
        .select("*")
        .eq("tenant_id", tenantSlug)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const filtered = useMemo(() => {
    let list = purchaseOrders;
    if (activeTab !== "all") {
      list = list.filter((po: any) => po.status === activeTab);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (po: any) =>
          (po.po_number || "").toLowerCase().includes(term) ||
          (po.vendor_name || "").toLowerCase().includes(term)
      );
    }
    return list;
  }, [purchaseOrders, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const total = purchaseOrders.length;
    const totalValue = purchaseOrders.reduce(
      (sum: number, po: any) => sum + (po.total_amount || 0),
      0
    );
    const pendingCount = purchaseOrders.filter(
      (po: any) => po.status === "pending_approval"
    ).length;
    const deliveredCount = purchaseOrders.filter(
      (po: any) => po.status === "delivered"
    ).length;
    return { total, totalValue, pendingCount, deliveredCount };
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-indigo-500" />
          Purchase Orders
        </h1>
        <p className="text-muted-foreground mt-1">
          BUYER agent manages procurement and vendor relations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total POs</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold text-indigo-500">
              ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pending Approval</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Delivered</p>
            <p className="text-2xl font-bold text-green-500">{stats.deliveredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO# or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading purchase orders...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No purchase orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left pb-3 font-medium text-muted-foreground">PO Number</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-right pb-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Currency</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Delivery Date</th>
                    <th className="text-left pb-3 font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po: any) => (
                    <tr
                      key={po.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 font-mono font-medium">{po.po_number || "--"}</td>
                      <td className="py-3">{po.vendor_name || "--"}</td>
                      <td className="py-3 text-right font-medium">
                        {po.total_amount != null
                          ? Number(po.total_amount).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "--"}
                      </td>
                      <td className="py-3 text-muted-foreground">{po.currency || "USD"}</td>
                      <td className="py-3">
                        <Badge
                          variant="outline"
                          className={`gap-1 ${STATUS_BADGE[po.status] || ""}`}
                        >
                          {STATUS_ICON[po.status]}
                          {(po.status || "").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {po.expected_delivery_date
                          ? format(new Date(po.expected_delivery_date), "MMM d, yyyy")
                          : "--"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {po.created_at
                          ? format(new Date(po.created_at), "MMM d, yyyy")
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
