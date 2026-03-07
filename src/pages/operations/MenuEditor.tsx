import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UtensilsCrossed,
  Plus,
  Pencil,
  Trash2,
  Star,
  ChefHat,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useRestaurantMenu, type MenuItem } from "@/hooks/useRestaurantMenu";
import { useToast } from "@/hooks/use-toast";

export default function MenuEditor() {
  const { menu, categories, items, isLoading, toggleAvailability, addItem, removeItem } =
    useRestaurantMenu();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category_id: "",
    prep_time_minutes: "",
  });

  const filteredItems = selectedCategory
    ? items.filter((i) => i.category_id === selectedCategory)
    : items;

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    try {
      await addItem.mutateAsync({
        name: newItem.name,
        price: parseFloat(newItem.price),
        description: newItem.description,
        category_id: newItem.category_id,
        currency: "AED",
        is_available: true,
        prep_time_minutes: newItem.prep_time_minutes
          ? parseInt(newItem.prep_time_minutes)
          : undefined,
      });
      toast({ title: "Item added successfully" });
      setShowAddDialog(false);
      setNewItem({ name: "", price: "", description: "", category_id: "", prep_time_minutes: "" });
    } catch {
      toast({ title: "Failed to add item", variant: "destructive" });
    }
  };

  const handleRemoveItem = async (itemId: string, itemName: string) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast({ title: `Removed ${itemName}` });
    } catch {
      toast({ title: "Failed to remove item", variant: "destructive" });
    }
  };

  const handleToggle = async (itemId: string) => {
    try {
      await toggleAvailability.mutateAsync(itemId);
    } catch {
      toast({ title: "Failed to update availability", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Menu Editor</h1>
          <p className="text-muted-foreground mt-1">Manage your restaurant menu</p>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No menu found for this tenant</p>
          <p className="text-sm">Create a menu to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu Editor</h1>
          <p className="text-muted-foreground mt-1">
            {menu.name} &mdash; {items.length} items, {categories.length} categories
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Item name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (AED) *</Label>
                  <Input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prep Time (min)</Label>
                  <Input
                    type="number"
                    value={newItem.prep_time_minutes}
                    onChange={(e) =>
                      setNewItem({ ...newItem, prep_time_minutes: e.target.value })
                    }
                    placeholder="15"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={newItem.category_id}
                  onChange={(e) => setNewItem({ ...newItem, category_id: e.target.value })}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Short description"
                />
              </div>
              <Button className="w-full" onClick={handleAddItem} disabled={addItem.isPending}>
                {addItem.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All ({items.length})
        </Button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.category_id === cat.id).length;
          return (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name} ({count})
            </Button>
          );
        })}
      </div>

      {/* Items grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const cat = categories.find((c) => c.id === item.category_id);
          return (
            <Card
              key={item.id}
              className={!item.is_available ? "opacity-60" : ""}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.popular && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {item.chef_special && (
                        <Badge className="text-xs bg-amber-500">
                          <ChefHat className="h-3 w-3 mr-1" />
                          Special
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                  <p className="font-bold text-lg whitespace-nowrap ml-2">
                    {item.price} {item.currency || "AED"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {cat?.name || "Uncategorized"}
                    {item.prep_time_minutes && ` | ${item.prep_time_minutes}min`}
                    {item.spice_level && ` | ${item.spice_level}`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {item.is_available ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={item.is_available}
                      onCheckedChange={() => handleToggle(item.id)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {item.is_available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveItem(item.id, item.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No items in this category</p>
        </div>
      )}
    </div>
  );
}
