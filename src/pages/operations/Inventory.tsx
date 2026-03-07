import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  TrendingDown,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  tenant_id: string;
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  reorder_quantity: number;
  unit_cost: number;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
}

function useInventory() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["restaurant-inventory", tenantId],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("restaurant_inventory")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("item_name");
      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
    enabled: !!tenantId,
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase
        .from("restaurant_inventory")
        .update({ current_stock: stock, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-inventory", tenantId] });
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<InventoryItem, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("restaurant_inventory").insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-inventory", tenantId] });
    },
  });

  const items = data || [];
  const lowStock = items.filter((i) => i.current_stock <= i.min_stock_level * 2 && i.current_stock > i.min_stock_level);
  const outOfStock = items.filter((i) => i.current_stock <= i.min_stock_level);
  const inStock = items.filter((i) => i.current_stock > i.min_stock_level * 2);

  return { items, isLoading, error, updateStock, addItem, lowStock, outOfStock, inStock };
}

function getStockStatus(item: InventoryItem) {
  if (item.current_stock <= item.min_stock_level)
    return { label: "Critical", color: "text-red-600", bg: "bg-red-500/10 border-red-500/30" };
  if (item.current_stock <= item.min_stock_level * 2)
    return { label: "Low", color: "text-yellow-600", bg: "bg-yellow-500/10 border-yellow-500/30" };
  return { label: "OK", color: "text-green-600", bg: "bg-green-500/10 border-green-500/30" };
}

export default function Inventory() {
  const { tenantId } = useTenant();
  const { items, isLoading, lowStock, outOfStock, inStock, updateStock, addItem } = useInventory();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStock, setEditingStock] = useState<{ id: string; value: string } | null>(null);
  const [newItem, setNewItem] = useState({
    item_name: "",
    category: "",
    unit: "kg",
    current_stock: "",
    min_stock_level: "",
    reorder_quantity: "",
    unit_cost: "",
  });

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const filtered = items
    .filter((i) => {
      if (searchTerm && !i.item_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (categoryFilter && i.category !== categoryFilter) return false;
      return true;
    });

  const handleAddItem = async () => {
    if (!newItem.item_name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    try {
      await addItem.mutateAsync({
        tenant_id: tenantId!,
        item_name: newItem.item_name,
        category: newItem.category || "general",
        unit: newItem.unit || "unit",
        current_stock: parseFloat(newItem.current_stock) || 0,
        min_stock_level: parseFloat(newItem.min_stock_level) || 5,
        reorder_quantity: parseFloat(newItem.reorder_quantity) || 10,
        unit_cost: parseFloat(newItem.unit_cost) || 0,
        supplier_id: null,
      });
      toast({ title: "Item added" });
      setShowAddDialog(false);
      setNewItem({
        item_name: "",
        category: "",
        unit: "kg",
        current_stock: "",
        min_stock_level: "",
        reorder_quantity: "",
        unit_cost: "",
      });
    } catch {
      toast({ title: "Failed to add item", variant: "destructive" });
    }
  };

  const handleStockUpdate = async (id: string) => {
    if (!editingStock) return;
    try {
      await updateStock.mutateAsync({ id, stock: parseFloat(editingStock.value) || 0 });
      setEditingStock(null);
      toast({ title: "Stock updated" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your stock and supplies</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name *</Label>
                  <Input
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                    placeholder="Chicken breast"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="meat"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="kg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input
                    type="number"
                    value={newItem.current_stock}
                    onChange={(e) => setNewItem({ ...newItem, current_stock: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Level</Label>
                  <Input
                    type="number"
                    value={newItem.min_stock_level}
                    onChange={(e) => setNewItem({ ...newItem, min_stock_level: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reorder Qty</Label>
                  <Input
                    type="number"
                    value={newItem.reorder_quantity}
                    onChange={(e) => setNewItem({ ...newItem, reorder_quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost (AED)</Label>
                  <Input
                    type="number"
                    value={newItem.unit_cost}
                    onChange={(e) => setNewItem({ ...newItem, unit_cost: e.target.value })}
                  />
                </div>
              </div>
              <Button className="w-full" onClick={handleAddItem} disabled={addItem.isPending}>
                {addItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{inStock.length}</p>
            <p className="text-sm text-muted-foreground">In Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{lowStock.length}</p>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{outOfStock.length}</p>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {outOfStock.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="font-semibold text-red-600">
                {outOfStock.length} item(s) at critical stock level
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {outOfStock.map((item) => (
                <Badge key={item.id} variant="destructive">
                  {item.item_name}: {item.current_stock} {item.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={categoryFilter === null ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "ghost"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Items list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading inventory...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No inventory items found</p>
            <p className="text-sm">Add items to track your stock</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const status = getStockStatus(item);
            const isEditing = editingStock?.id === item.id;

            return (
              <Card key={item.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="min-w-[180px]">
                        <p className="font-semibold">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category} | {item.unit_cost} AED/{item.unit}
                        </p>
                      </div>
                      <Badge variant="outline" className={status.bg}>
                        {status.label}
                      </Badge>
                      <div className="text-sm">
                        <span className={`font-bold ${status.color}`}>
                          {item.current_stock}
                        </span>
                        <span className="text-muted-foreground"> / min {item.min_stock_level} {item.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            type="number"
                            className="w-20 h-8"
                            value={editingStock.value}
                            onChange={(e) =>
                              setEditingStock({ id: item.id, value: e.target.value })
                            }
                            onKeyDown={(e) => e.key === "Enter" && handleStockUpdate(item.id)}
                          />
                          <Button size="sm" onClick={() => handleStockUpdate(item.id)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingStock({
                              id: item.id,
                              value: item.current_stock.toString(),
                            })
                          }
                        >
                          Update Stock
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
