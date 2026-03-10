import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClinicProducts } from "@/hooks/useClinicProducts";
import { Package, AlertTriangle, DollarSign } from "lucide-react";

export default function Products() {
  const { products, isLoading, lowStockProducts, totalValue } = useClinicProducts();

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
              <Card key={product.id} className={isLow ? "border-orange-300" : ""}>
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
                    <span className={isLow ? "text-orange-600 font-medium" : ""}>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
