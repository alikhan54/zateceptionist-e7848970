import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useClinicProducts, ClinicProduct } from "@/hooks/useClinicProducts";
import { Package, AlertTriangle, DollarSign, Pencil, Minus, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRODUCT_CATEGORIES = ["skincare", "haircare", "consumable", "device", "supplement", "other"];

export default function Products() {
  const { products, isLoading, lowStockProducts, totalValue, updateStock, createProduct } = useClinicProducts();
  const { toast } = useToast();
  const [adjustProduct, setAdjustProduct] = useState<ClinicProduct | null>(null);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Phase 10A — Add Product dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("skincare");
  const [addBrand, setAddBrand] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addStock, setAddStock] = useState("0");
  const [creating, setCreating] = useState(false);

  const resetAdd = () => {
    setAddName(""); setAddCategory("skincare"); setAddBrand(""); setAddPrice(""); setAddStock("0");
  };

  const handleCreate = async () => {
    const name = addName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Please give the product a name", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(addPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Invalid price", description: "Enter a non-negative number", variant: "destructive" });
      return;
    }
    const stockNum = parseInt(addStock, 10);
    setCreating(true);
    try {
      await createProduct.mutateAsync({
        name,
        category: addCategory,
        brand: addBrand.trim() || null,
        price: priceNum,
        currency: "AED",
        stock_quantity: isNaN(stockNum) ? 0 : Math.max(0, stockNum),
        min_stock_level: 5,
        is_active: true,
      } as any);
      toast({ title: "Product added", description: `${name} → AED ${priceNum}` });
      setAddOpen(false);
      resetAdd();
    } catch (err: any) {
      toast({ title: "Could not create", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openAdjust = (p: ClinicProduct) => {
    setAdjustProduct(p);
    setAdjustment(0);
    setReason("");
  };

  const handleAdjust = async () => {
    if (!adjustProduct || adjustment === 0) return;
    setSaving(true);
    try {
      const newStock = Math.max(0, (adjustProduct.stock_quantity || 0) + adjustment);
      await updateStock.mutateAsync({ id: adjustProduct.id, quantity: newStock });
      toast({
        title: "Stock adjusted",
        description: `${adjustProduct.name}: ${adjustProduct.stock_quantity} → ${newStock}${reason ? ` (${reason})` : ""}`,
      });
      setAdjustProduct(null);
    } catch (err: any) {
      toast({ title: "Could not adjust stock", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Product inventory and skincare catalog</p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="add-product-button">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{products.length}</div>
                <p className="text-xs text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">AED {totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Inventory Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{lowStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading products...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isLow = product.stock_quantity <= product.min_stock_level;
            return (
              <Card key={product.id} className={isLow ? "border-orange-300" : ""} data-testid={`product-card-${product.id}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    </div>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="font-semibold">{product.currency} {product.price}</span>
                    {product.sku && <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>}
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className={isLow ? "text-orange-600 font-medium" : ""} data-testid={`product-stock-${product.id}`}>
                      Stock: {product.stock_quantity}
                      {isLow && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                    </span>
                    <span className="text-muted-foreground">Min: {product.min_stock_level}</span>
                  </div>
                  {product.usage_instructions && (
                    <p className="text-xs text-muted-foreground border-t pt-2 line-clamp-2">{product.usage_instructions}</p>
                  )}
                  {product.recommended_for_treatments && product.recommended_for_treatments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.recommended_for_treatments.map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => openAdjust(product)}
                      data-testid={`adjust-stock-${product.id}`}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Adjust stock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Product dialog — Phase 10A */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) { setAddOpen(false); resetAdd(); } }}>
        <DialogContent className="max-w-md" data-testid="add-product-dialog">
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>Add a new SKU to the product catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-p-name">Name</Label>
              <Input id="add-p-name" data-testid="add-product-name-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Vitamin C Serum 30ml" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-p-category">Category</Label>
              <select
                id="add-p-category"
                data-testid="add-product-category-input"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-p-brand">Brand</Label>
              <Input id="add-p-brand" data-testid="add-product-brand-input" value={addBrand} onChange={(e) => setAddBrand(e.target.value)} placeholder="(optional)" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-p-price">Price (AED)</Label>
              <Input id="add-p-price" data-testid="add-product-price-input" type="number" step="1" min="0" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-p-stock">Opening stock</Label>
              <Input id="add-p-stock" data-testid="add-product-stock-input" type="number" step="1" min="0" value={addStock} onChange={(e) => setAddStock(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetAdd(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} data-testid="add-product-submit">
              {creating ? "Adding..." : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock dialog — Phase 5d J12 */}
      <Dialog open={!!adjustProduct} onOpenChange={(v) => !v && setAdjustProduct(null)}>
        <DialogContent className="max-w-md" data-testid="adjust-stock-dialog">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription>
              {adjustProduct?.name} — current stock {adjustProduct?.stock_quantity}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="stock-adjustment">Adjustment (+/-)</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setAdjustment(a => a - 1)} aria-label="Decrement">
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="stock-adjustment"
                  data-testid="stock-adjustment-input"
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(parseInt(e.target.value || "0", 10))}
                  className="text-center"
                />
                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setAdjustment(a => a + 1)} aria-label="Increment">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                New stock will be {Math.max(0, (adjustProduct?.stock_quantity || 0) + adjustment)}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock-reason">Reason (optional)</Label>
              <Textarea
                id="stock-reason"
                data-testid="stock-reason-input"
                placeholder="Restock / shrinkage / sale / damaged"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustProduct(null)}>Cancel</Button>
            <Button
              onClick={handleAdjust}
              disabled={saving || adjustment === 0}
              data-testid="stock-adjust-submit"
            >
              {saving ? "Saving..." : "Save adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
