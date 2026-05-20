import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Camera, X, Image as ImageIcon } from "lucide-react";

const MAX_MB = 5;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

interface PhotoPair {
  consultation_id: string;
  date: string;
  caption: string | null;
  before_url: string | null;
  after_url: string | null;
}

interface Props {
  patientId: string;
  tenantUuid: string;
}

export function PatientPhotosTab({ patientId, tenantUuid }: Props) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [caption, setCaption] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Pull all consultations for this patient, extract before/after photos
  // arrays into a flat pair list ordered by date desc.
  const { data: pairs = [], isLoading } = useQuery({
    queryKey: ["patient_photos", tenantId, patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_consultations" as any)
        .select("id, created_at, follow_up_date, before_photos, after_photos, chief_complaint")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const out: PhotoPair[] = [];
      for (const c of (data as any[]) || []) {
        const before = Array.isArray(c.before_photos) ? c.before_photos : [];
        const after = Array.isArray(c.after_photos) ? c.after_photos : [];
        const max = Math.max(before.length, after.length);
        for (let i = 0; i < max; i++) {
          out.push({
            consultation_id: c.id,
            date: (c.follow_up_date || c.created_at || "").slice(0, 10),
            caption: c.chief_complaint || null,
            before_url: before[i]?.url || (typeof before[i] === "string" ? before[i] : null),
            after_url: after[i]?.url || (typeof after[i] === "string" ? after[i] : null),
          });
        }
      }
      return out;
    },
    enabled: !!tenantId && !!patientId,
  });

  const onPick = (slot: "before" | "after", f: File | null) => {
    setFileError(null);
    if (!f) { (slot === "before" ? setBeforeFile : setAfterFile)(null); return; }
    if (!ALLOWED.includes(f.type)) { setFileError("Only JPG / PNG / WebP accepted"); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setFileError(`File too large — max ${MAX_MB} MB`); return; }
    (slot === "before" ? setBeforeFile : setAfterFile)(f);
  };

  const uploadToBucket = async (file: File, slot: string): Promise<string> => {
    const ts = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `patients/${tenantUuid}/${patientId}/${ts}_${slot}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!beforeFile && !afterFile) throw new Error("Pick at least one photo");
      const beforeUrl = beforeFile ? await uploadToBucket(beforeFile, "before") : null;
      const afterUrl = afterFile ? await uploadToBucket(afterFile, "after") : null;

      const newBefore = beforeUrl ? [{ url: beforeUrl, uploaded_at: new Date().toISOString(), caption }] : [];
      const newAfter = afterUrl ? [{ url: afterUrl, uploaded_at: new Date().toISOString(), caption }] : [];

      // Create a lightweight consultation row to hold the photo pair so the
      // jsonb arrays are properly linked (additive: no schema change, uses
      // existing columns only).
      const { data, error } = await supabase
        .from("clinic_consultations" as any)
        .insert({
          tenant_id: tenantId,
          patient_id: patientId,
          practitioner_name: "—",
          chief_complaint: caption || "Progress photos",
          follow_up_date: date,
          before_photos: newBefore,
          after_photos: newAfter,
          report_status: "draft",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient_photos", tenantId, patientId] });
      toast({ title: "Photos saved", description: "Progress photos added to patient record." });
      setOpen(false);
      setBeforeFile(null);
      setAfterFile(null);
      setCaption("");
      setFileError(null);
    },
    onError: (err: Error) => {
      toast({ title: "Could not save photos", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4" data-testid="patient-photos-tab">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Progress Photos
          </h3>
          <p className="text-xs text-muted-foreground">Before / after pairs across consultations</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} data-testid="add-photos-button">
          <Plus className="h-3 w-3 mr-1" /> Add Photos
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading photos…</p>
      ) : pairs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No progress photos yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "+ Add Photos" to upload the first before/after pair.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pairs.map((p, i) => (
            <Card key={`${p.consultation_id}-${i}`} data-testid={`photo-pair-${i}`}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">{p.date}</Badge>
                  {p.caption && <span className="text-xs text-muted-foreground truncate max-w-[60%]">{p.caption}</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {p.before_url ? (
                    <button type="button" className="relative aspect-square rounded overflow-hidden bg-muted" onClick={() => setLightbox(p.before_url!)}>
                      <img src={p.before_url} alt="before" className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">BEFORE</span>
                    </button>
                  ) : (
                    <div className="aspect-square rounded bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">no before</div>
                  )}
                  {p.after_url ? (
                    <button type="button" className="relative aspect-square rounded overflow-hidden bg-muted" onClick={() => setLightbox(p.after_url!)}>
                      <img src={p.after_url} alt="after" className="absolute inset-0 w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary/80 text-primary-foreground px-1 rounded">AFTER</span>
                    </button>
                  ) : (
                    <div className="aspect-square rounded bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground">no after</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="add-photos-dialog">
          <DialogHeader><DialogTitle>Add progress photos</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Before</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onPick("before", e.target.files?.[0] ?? null)} data-testid="photo-before-input" />
                {beforeFile && <p className="text-xs text-muted-foreground truncate">{beforeFile.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">After</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onPick("after", e.target.files?.[0] ?? null)} data-testid="photo-after-input" />
                {afterFile && <p className="text-xs text-muted-foreground truncate">{afterFile.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="photo-date-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Caption / notes</Label>
              <Textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. 4-week Botox follow-up" data-testid="photo-caption-input" />
            </div>
            {fileError && <p className="text-xs text-destructive" data-testid="photo-file-error">{fileError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => { setSaving(true); saveMutation.mutateAsync().finally(() => setSaving(false)); }}
              disabled={saving || saveMutation.isPending || (!beforeFile && !afterFile)}
              data-testid="photo-save-submit"
            >
              {(saving || saveMutation.isPending) ? "Saving…" : "Save photos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2" data-testid="photo-lightbox">
          {lightbox && <img src={lightbox} alt="enlarged" className="w-full h-auto rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
