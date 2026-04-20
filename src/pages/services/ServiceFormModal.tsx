// ============================================================================
// Service form modal (create / edit)
// Writes to `services` table with tenant_id = SLUG (tenantId from useTenant).
// ============================================================================
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Service } from "./ServicesPage";

const CURRENCIES = ["AED", "PKR", "USD", "GBP", "EUR", "INR", "SAR", "QAR", "CAD", "AUD"];

interface Props {
  open: boolean;
  onClose: () => void;
  existing: Service | null;
  categories: string[];
}

export default function ServiceFormModal({ open, onClose, existing, categories }: Props) {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!existing;

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    customCategory: "",
    price: "" as string,
    currency: tenantConfig?.currency || "",
    duration_minutes: "" as string,
    is_active: true,
    image_url: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "",
        description: existing.description || "",
        category: categories.includes(existing.category || "") ? (existing.category || "") : "__custom__",
        customCategory: categories.includes(existing.category || "") ? "" : (existing.category || ""),
        price: existing.price !== null ? String(existing.price) : "",
        currency: existing.currency || tenantConfig?.currency || "",
        duration_minutes: existing.duration_minutes !== null ? String(existing.duration_minutes) : "",
        is_active: !!existing.is_active,
        image_url: existing.image_url || "",
      });
    } else {
      setForm({
        name: "", description: "", category: "", customCategory: "",
        price: "", currency: tenantConfig?.currency || "",
        duration_minutes: "", is_active: true, image_url: "",
      });
    }
  }, [existing, categories, tenantConfig?.currency]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant context");
      if (!form.name.trim()) throw new Error("Name is required");

      const category =
        form.category === "__custom__"
          ? form.customCategory.trim() || null
          : form.category || null;

      const payload = {
        tenant_id: tenantId, // services uses SLUG
        name: form.name.trim(),
        description: form.description.trim() || null,
        category,
        price: form.price ? parseFloat(form.price) : null,
        currency: form.currency || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes, 10) : null,
        is_active: form.is_active,
        image_url: form.image_url.trim() || null,
      };

      if (isEdit && existing) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", existing.id)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services", tenantId] });
      toast({ title: isEdit ? "Service updated" : "Service created" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit service" : "Add service"}</DialogTitle>
          <DialogDescription>
            This service will be available to your AI agent for quoting and booking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="svc-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="svc-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Full Body PPF - Sedan"
              required
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="svc-desc">Description</Label>
            <Textarea
              id="svc-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What's included, warranty terms, ideal use case"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="svc-cat">Category</Label>
              <select
                id="svc-cat"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">(none)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">+ new category...</option>
              </select>
              {form.category === "__custom__" && (
                <Input
                  className="mt-2"
                  placeholder="New category name"
                  value={form.customCategory}
                  onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                />
              )}
            </div>

            <div>
              <Label htmlFor="svc-duration">Duration (minutes)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={0}
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                placeholder="e.g. 60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="svc-price">Price</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="e.g. 215000"
              />
            </div>
            <div>
              <Label htmlFor="svc-currency">Currency</Label>
              <select
                id="svc-currency"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="">(inherit from tenant)</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="svc-image">Image URL (optional)</Label>
            <Input
              id="svc-image"
              type="url"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-3">
              <Switch
                id="svc-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="svc-active" className="cursor-pointer">
                Active {form.is_active ? "(visible to AI agent)" : "(hidden from AI agent)"}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending || !form.name.trim()}>
              {saveMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
