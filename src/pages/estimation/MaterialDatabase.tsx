import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEstimationMaterials, EstimationMaterial } from "@/hooks/useEstimationMaterials";
import { Warehouse, Plus, Search, Package } from "lucide-react";

const CATEGORIES = ["all", "tile", "concrete_coating", "epoxy", "setting_material", "trim", "waterproofing", "accessory", "substrate", "wall_base"];

export default function MaterialDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);

  const { materials, isLoading, stats, createMaterial } = useEstimationMaterials(
    searchTerm || undefined,
    category !== "all" ? category : undefined
  );

  const [newMat, setNewMat] = useState({
    material_name: "",
    material_tag: "",
    manufacturer: "",
    category: "tile",
    unit_of_measure: "SF",
    unit_price: "",
    size: "",
    color: "",
    waste_factor_pct: "10",
  });

  const handleCreate = async () => {
    if (!newMat.material_name) return;
    try {
      await createMaterial.mutateAsync({
        material_name: newMat.material_name,
        material_tag: newMat.material_tag || null,
        manufacturer: newMat.manufacturer || null,
        category: newMat.category,
        unit_of_measure: newMat.unit_of_measure,
        unit_price: newMat.unit_price ? parseFloat(newMat.unit_price) : null,
        size: newMat.size || null,
        color: newMat.color || null,
        waste_factor_pct: parseFloat(newMat.waste_factor_pct) || 10,
        is_active: true,
      } as any);
      toast.success("Material added successfully");
      setShowCreate(false);
      setNewMat({ material_name: "", material_tag: "", manufacturer: "", category: "tile", unit_of_measure: "SF", unit_price: "", size: "", color: "", waste_factor_pct: "10" });
    } catch (err: any) {
      toast.error(err.message || "Failed to add material");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material Database</h1>
          <p className="text-muted-foreground">Master catalog of materials, pricing, and waste factors</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Material</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Material Name *</Label>
                <Input value={newMat.material_name} onChange={e => setNewMat(p => ({ ...p, material_name: e.target.value }))} placeholder="e.g., Creative Materials 12x24 Porcelain" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material Tag</Label>
                  <Input value={newMat.material_tag} onChange={e => setNewMat(p => ({ ...p, material_tag: e.target.value }))} placeholder="e.g., CM-P1224" />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input value={newMat.manufacturer} onChange={e => setNewMat(p => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g., Creative Materials" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newMat.category} onValueChange={v => setNewMat(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter(c => c !== "all").map(c => (
                        <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measure</Label>
                  <Select value={newMat.unit_of_measure} onValueChange={v => setNewMat(p => ({ ...p, unit_of_measure: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SF">SF (sq ft)</SelectItem>
                      <SelectItem value="LF">LF (linear ft)</SelectItem>
                      <SelectItem value="EA">EA (each)</SelectItem>
                      <SelectItem value="BAG">BAG</SelectItem>
                      <SelectItem value="GAL">GAL (gallon)</SelectItem>
                      <SelectItem value="BOX">BOX</SelectItem>
                      <SelectItem value="ROLL">ROLL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Unit Price ($)</Label>
                  <Input type="number" step="0.01" value={newMat.unit_price} onChange={e => setNewMat(p => ({ ...p, unit_price: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Input value={newMat.size} onChange={e => setNewMat(p => ({ ...p, size: e.target.value }))} placeholder="12x24" />
                </div>
                <div className="space-y-2">
                  <Label>Waste %</Label>
                  <Input type="number" step="0.5" value={newMat.waste_factor_pct} onChange={e => setNewMat(p => ({ ...p, waste_factor_pct: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={newMat.color} onChange={e => setNewMat(p => ({ ...p, color: e.target.value }))} placeholder="e.g., Bianco Oro" />
              </div>
              <Button onClick={handleCreate} disabled={createMaterial.isPending} className="w-full">
                {createMaterial.isPending ? "Adding..." : "Add Material"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Materials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMaterials}</div>
            <p className="text-xs text-muted-foreground">{stats.globalCount} global, {stats.customCount} custom</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories.length}</div>
            <p className="text-xs text-muted-foreground">{stats.trades.length} trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search materials..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tile">Tile</TabsTrigger>
            <TabsTrigger value="setting_material">Setting</TabsTrigger>
            <TabsTrigger value="trim">Trim</TabsTrigger>
            <TabsTrigger value="concrete_coating">Coating</TabsTrigger>
            <TabsTrigger value="epoxy">Epoxy</TabsTrigger>
            <TabsTrigger value="accessory">Accessory</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading materials...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Tag</th>
                    <th className="p-3 text-left font-medium">Material</th>
                    <th className="p-3 text-left font-medium">Manufacturer</th>
                    <th className="p-3 text-left font-medium">Category</th>
                    <th className="p-3 text-left font-medium">Size</th>
                    <th className="p-3 text-left font-medium">Color</th>
                    <th className="p-3 text-left font-medium">Unit</th>
                    <th className="p-3 text-right font-medium">Price</th>
                    <th className="p-3 text-right font-medium">Waste %</th>
                    <th className="p-3 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(m => (
                    <tr key={m.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{m.material_tag || "—"}</td>
                      <td className="p-3 font-medium">{m.material_name}</td>
                      <td className="p-3">{m.manufacturer || "—"}</td>
                      <td className="p-3"><Badge variant="outline">{(m.category || "").replace(/_/g, " ")}</Badge></td>
                      <td className="p-3">{m.size || "—"}</td>
                      <td className="p-3">{m.color || "—"}</td>
                      <td className="p-3">{m.unit_of_measure}</td>
                      <td className="p-3 text-right">{m.unit_price ? `$${m.unit_price.toFixed(2)}` : "—"}</td>
                      <td className="p-3 text-right">{m.standard_waste_pct != null ? `${m.standard_waste_pct}%` : "—"}</td>
                      <td className="p-3">
                        <Badge variant={m.tenant_id === "global" ? "secondary" : "default"} className="text-xs">
                          {m.tenant_id === "global" ? "Global" : "Custom"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {materials.length === 0 && (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No materials found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
