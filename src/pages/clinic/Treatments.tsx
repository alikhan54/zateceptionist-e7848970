import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClinicTreatments, ClinicTreatment } from "@/hooks/useClinicTreatments";
import { Clock, DollarSign, AlertCircle, CheckCircle, Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const KNOWN_CATEGORIES = ["aesthetics", "dermatology", "body", "hair", "skincare"];

export default function Treatments() {
  const { treatments, isLoading, categories, updateTreatment, createTreatment } = useClinicTreatments();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editTreatment, setEditTreatment] = useState<ClinicTreatment | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editDuration, setEditDuration] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Phase 10A — Add Treatment dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("aesthetics");
  const [addPrice, setAddPrice] = useState("");
  const [addDuration, setAddDuration] = useState("30");
  const [addDescription, setAddDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const resetAdd = () => {
    setAddName(""); setAddCategory("aesthetics"); setAddPrice(""); setAddDuration("30"); setAddDescription("");
  };

  const handleCreate = async () => {
    const name = addName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Please give the treatment a name", variant: "destructive" });
      return;
    }
    const priceNum = parseFloat(addPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Invalid price", description: "Enter a non-negative number", variant: "destructive" });
      return;
    }
    const durationNum = parseInt(addDuration, 10);
    setCreating(true);
    try {
      await createTreatment.mutateAsync({
        name,
        category: addCategory,
        price: priceNum,
        duration_minutes: isNaN(durationNum) ? 30 : durationNum,
        currency: "AED",
        description: addDescription.trim() || null,
        is_active: true,
      } as any);
      toast({ title: "Treatment added", description: `${name} → AED ${priceNum}` });
      setAddOpen(false);
      resetAdd();
    } catch (err: any) {
      toast({ title: "Could not create", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (t: ClinicTreatment) => {
    setEditTreatment(t);
    setEditPrice(String(t.price ?? 0));
    setEditDuration(String(t.duration_minutes ?? 30));
    setEditDescription(t.description ?? "");
  };

  const handleSave = async () => {
    if (!editTreatment) return;
    const priceNum = parseFloat(editPrice);
    const durationNum = parseInt(editDuration, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Invalid price", description: "Enter a non-negative number", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await updateTreatment.mutateAsync({
        id: editTreatment.id,
        updates: {
          price: priceNum,
          duration_minutes: isNaN(durationNum) ? editTreatment.duration_minutes : durationNum,
          description: editDescription.trim() || null,
        } as any,
      });
      toast({ title: "Treatment updated", description: `${editTreatment.name} → AED ${priceNum}` });
      setEditTreatment(null);
    } catch (err: any) {
      toast({ title: "Could not update", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = selectedCategory === "all" ? treatments : treatments.filter(t => t.category === selectedCategory);

  const categoryLabels: Record<string, string> = {
    aesthetics: "Aesthetics", dermatology: "Dermatology", body: "Body", hair: "Hair", skincare: "Skincare",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treatments</h1>
          <p className="text-muted-foreground">Treatment catalog and service management</p>
        </div>
        <Button onClick={() => setAddOpen(true)} data-testid="add-treatment-button">
          <Plus className="mr-2 h-4 w-4" /> Add Treatment
        </Button>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          <TabsTrigger value="all">All ({treatments.length})</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {categoryLabels[cat] || cat} ({treatments.filter(t => t.category === cat).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-muted-foreground">Loading treatments...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((treatment) => (
            <Card key={treatment.id} data-testid={`treatment-card-${treatment.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{treatment.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge>{treatment.category}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEdit(treatment)}
                      data-testid={`edit-treatment-${treatment.id}`}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{treatment.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {treatment.duration_minutes} min</span>
                  <span className="flex items-center gap-1 font-semibold"><DollarSign className="h-4 w-4" /> {treatment.currency} {treatment.price}</span>
                </div>
                <div className="flex gap-2">
                  {treatment.requires_consultation && (
                    <Badge variant="secondary" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Consultation Required</Badge>
                  )}
                  {treatment.requires_consent && (
                    <Badge variant="outline" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Consent Form</Badge>
                  )}
                </div>
                {treatment.pre_care_instructions && (
                  <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Pre-Care Instructions</h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-3">{treatment.pre_care_instructions}</p>
                  </div>
                )}
                {treatment.post_care_instructions && (
                  <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Post-Care Instructions</h4>
                    <p className="text-xs text-green-600 dark:text-green-400 line-clamp-3">{treatment.post_care_instructions}</p>
                  </div>
                )}
                {treatment.contraindications && (
                  <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Contraindications</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">{treatment.contraindications}</p>
                  </div>
                )}
                {treatment.recommended_products && treatment.recommended_products.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-1">Recommended Products</h4>
                    <div className="flex flex-wrap gap-1">
                      {treatment.recommended_products.map((p, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add treatment dialog — Phase 10A */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) { setAddOpen(false); resetAdd(); } }}>
        <DialogContent className="max-w-md" data-testid="add-treatment-dialog">
          <DialogHeader>
            <DialogTitle>Add treatment</DialogTitle>
            <DialogDescription>Create a new entry in the treatment catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" data-testid="add-treatment-name-input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Microneedling Premium" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-category">Category</Label>
              <select
                id="add-category"
                data-testid="add-treatment-category-input"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
              >
                {KNOWN_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-price">Price (AED)</Label>
              <Input id="add-price" data-testid="add-treatment-price-input" type="number" step="1" min="0" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-duration">Duration (minutes)</Label>
              <Input id="add-duration" data-testid="add-treatment-duration-input" type="number" step="5" min="5" value={addDuration} onChange={(e) => setAddDuration(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-description">Description</Label>
              <Textarea id="add-description" data-testid="add-treatment-description-input" rows={3} value={addDescription} onChange={(e) => setAddDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); resetAdd(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} data-testid="add-treatment-submit">
              {creating ? "Adding..." : "Add treatment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit treatment dialog — Phase 5d J13 */}
      <Dialog open={!!editTreatment} onOpenChange={(v) => !v && setEditTreatment(null)}>
        <DialogContent className="max-w-md" data-testid="edit-treatment-dialog">
          <DialogHeader>
            <DialogTitle>Edit treatment</DialogTitle>
            <DialogDescription>{editTreatment?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="treatment-price">Price (AED)</Label>
              <Input
                id="treatment-price"
                data-testid="treatment-price-input"
                type="number"
                step="1"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="treatment-duration">Duration (minutes)</Label>
              <Input
                id="treatment-duration"
                data-testid="treatment-duration-input"
                type="number"
                step="5"
                min="5"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="treatment-description">Description</Label>
              <Textarea
                id="treatment-description"
                data-testid="treatment-description-input"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTreatment(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              data-testid="treatment-save-submit"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
