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

export default function Products() {
  const { products, isLoading, lowStockProducts, totalValue, updateStock } = useClinicProducts();
  const { toast } = useToast();
  const [adjustProduct, setAdjustProduct] = useState<ClinicProduct | null>(null);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Product inventory and skincare catalog</p>
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
