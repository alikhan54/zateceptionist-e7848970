import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquareQuote, Star, Plus, Trash2 } from "lucide-react";

interface Testimonial {
  id: string;
  patient_display_name: string;
  treatment_name: string | null;
  quote: string;
  rating: number | null;
  photo_url: string | null;
  consent_signed: boolean;
  is_published: boolean;
  created_at: string;
}

export default function TestimonialsPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { patients } = useClinicPatients();
  const { treatments } = useClinicTreatments();

  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [treatmentId, setTreatmentId] = useState<string>("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [consentSigned, setConsentSigned] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["patient_testimonials", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_testimonials" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data || []) as unknown as Testimonial[];
    },
    enabled: !!tenantId,
  });

  const reset = () => {
    setPatientId(""); setDisplayName(""); setTreatmentId(""); setQuote(""); setRating(5);
    setPhotoFile(null); setConsentSigned(false);
  };

  const onPatientChange = (id: string) => {
    setPatientId(id);
    const p = patients.find((x: any) => x.id === id);
    if (p) setDisplayName(p.full_name || "");
  };

  const handleSave = async () => {
    if (!consentSigned) { toast({ title: "Consent required", description: "Patient must consent to publishing their testimonial", variant: "destructive" }); return; }
    if (!displayName.trim() || !quote.trim()) { toast({ title: "Name and quote are required", variant: "destructive" }); return; }
    setSaving(true);
    let photo_url: string | null = null;
    try {
      if (photoFile) {
        const ts = Date.now();
        const safe = photoFile.name.replace(/[^A-Za-z0-9._-]/g, "_");
        const path = `${tenantId}/${ts}_${safe}`;
        const { error: upErr } = await supabase.storage.from("testimonial-photos").upload(path, photoFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("testimonial-photos").getPublicUrl(path);
        photo_url = urlData?.publicUrl || null;
      }
      const t = treatments.find((x: any) => x.id === treatmentId);
      const { error } = await supabase.from("patient_testimonials" as any).insert({
        tenant_id: tenantId,
        patient_id: patientId || null,
        patient_display_name: displayName.trim(),
        treatment_id: treatmentId || null,
        treatment_name: t?.name || null,
        quote: quote.trim(),
        rating,
        photo_url,
        consent_signed: true,
        consent_signed_at: new Date().toISOString(),
        is_published: false,
      } as any);
      if (error) throw error;
      toast({ title: "Testimonial added", description: "Toggle Published when ready to show publicly" });
      setOpen(false); reset();
      queryClient.invalidateQueries({ queryKey: ["patient_testimonials", tenantId] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const togglePublished = async (t: Testimonial) => {
    try {
      await supabase.from("patient_testimonials" as any).update({ is_published: !t.is_published } as any).eq("id", t.id).eq("tenant_id", tenantId);
      queryClient.invalidateQueries({ queryKey: ["patient_testimonials", tenantId] });
    } catch (err: any) {
      toast({ title: "Update failed", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const handleDelete = async (t: Testimonial) => {
    try {
      await supabase.from("patient_testimonials" as any).delete().eq("id", t.id).eq("tenant_id", tenantId);
      toast({ title: "Testimonial deleted" });
      queryClient.invalidateQueries({ queryKey: ["patient_testimonials", tenantId] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><MessageSquareQuote className="h-7 w-7" /> Testimonials</h1>
          <p className="text-muted-foreground">Patient testimonials with consent tracking</p>
        </div>
        <Button onClick={() => setOpen(true)} data-testid="add-testimonial-button">
          <Plus className="mr-2 h-4 w-4" /> Add Testimonial
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : testimonials.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
          <MessageSquareQuote className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No testimonials yet.</p>
          <p className="text-xs mt-1">Add one with the patient's explicit consent.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="testimonials-grid">
          {testimonials.map(t => (
            <Card key={t.id} data-testid={`testimonial-card-${t.id}`}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {t.photo_url ? <img src={t.photo_url} alt={t.patient_display_name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">{t.patient_display_name[0]}</div>}
                    <div>
                      <p className="font-semibold text-sm">{t.patient_display_name}</p>
                      {t.treatment_name && <Badge variant="outline" className="text-[10px]">{t.treatment_name}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`h-3.5 w-3.5 ${(t.rating ?? 0) >= i ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm italic">"{t.quote}"</p>
                <div className="flex items-center justify-between pt-2 border-t">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={t.is_published} onChange={() => togglePublished(t)} data-testid={`testimonial-publish-${t.id}`} />
                    <span>Published</span>
                  </label>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)} data-testid={`testimonial-delete-${t.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); reset(); } }}>
        <DialogContent className="max-w-md" data-testid="add-testimonial-dialog">
          <DialogHeader>
            <DialogTitle>Add testimonial</DialogTitle>
            <DialogDescription>Patient consent is required before saving</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Patient (optional, prefills display name)</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={patientId} onChange={(e) => onPatientChange(e.target.value)} data-testid="testimonial-patient-input">
                <option value="">— pick from list (or leave blank) —</option>
                {patients.map((p: any) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-name">Display name *</Label>
              <Input id="ts-name" data-testid="testimonial-name-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Layla H." />
            </div>
            <div className="space-y-1.5">
              <Label>Treatment</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={treatmentId} onChange={(e) => setTreatmentId(e.target.value)} data-testid="testimonial-treatment-input">
                <option value="">— optional —</option>
                {treatments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-quote">Quote *</Label>
              <Textarea id="ts-quote" rows={3} data-testid="testimonial-quote-input" value={quote} onChange={(e) => setQuote(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rating: {rating} / 5</Label>
              <input type="range" min={1} max={5} step={1} value={rating} onChange={(e) => setRating(parseInt(e.target.value, 10))} className="w-full" data-testid="testimonial-rating-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Photo (optional)</Label>
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} data-testid="testimonial-photo-input" />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded border bg-amber-50/40 dark:bg-amber-950/20">
              <input type="checkbox" className="mt-0.5" checked={consentSigned} onChange={(e) => setConsentSigned(e.target.checked)} data-testid="testimonial-consent-input" />
              <span>The patient has explicitly consented to publishing this testimonial with their name and photo. *</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !consentSigned} data-testid="testimonial-save-submit">
              {saving ? "Saving…" : "Save testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
