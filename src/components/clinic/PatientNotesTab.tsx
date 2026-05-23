import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PatientNote {
  id: string;
  patient_id: string;
  note_type: string | null;
  content: string;
  author_id: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

const NOTE_TYPES = ["general", "clinical", "allergy", "private"];

interface PatientNotesTabProps {
  patientId: string;
}

const TYPE_COLOR: Record<string, string> = {
  general: "text-slate-600 dark:text-slate-300 border-slate-300",
  clinical: "text-violet-600 dark:text-violet-300 border-violet-300",
  allergy: "text-red-600 dark:text-red-300 border-red-300",
  private: "text-amber-600 dark:text-amber-300 border-amber-300",
};

export function PatientNotesTab({ patientId }: PatientNotesTabProps) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PatientNote | null>(null);
  const [noteType, setNoteType] = useState("general");
  const [content, setContent] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: notes = [], isLoading } = useQuery<PatientNote[]>({
    queryKey: ["patient_notes", tenantId, patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_patient_notes" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data || []) as unknown as PatientNote[];
    },
    enabled: !!tenantId && !!patientId,
  });

  const openAdd = () => {
    setEditing(null); setNoteType("general"); setContent(""); setIsPrivate(false); setOpen(true);
  };
  const openEdit = (n: PatientNote) => {
    setEditing(n); setNoteType(n.note_type || "general"); setContent(n.content); setIsPrivate(n.is_private); setOpen(true);
  };

  const handleSave = async () => {
    const c = content.trim();
    if (!c) { toast({ title: "Note content required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("clinic_patient_notes" as any).update({
          note_type: noteType, content: c, is_private: isPrivate, updated_at: new Date().toISOString(),
        } as any).eq("id", editing.id).eq("tenant_id", tenantId);
        if (error) throw error;
        toast({ title: "Note updated" });
      } else {
        const { error } = await supabase.from("clinic_patient_notes" as any).insert({
          tenant_id: tenantId, patient_id: patientId,
          note_type: noteType, content: c, is_private: isPrivate,
          author_id: (authUser as any)?.id || null,
        } as any);
        if (error) throw error;
        toast({ title: "Note added" });
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["patient_notes", tenantId, patientId] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (n: PatientNote) => {
    try {
      await supabase.from("clinic_patient_notes" as any).delete().eq("id", n.id).eq("tenant_id", tenantId);
      toast({ title: "Note deleted" });
      queryClient.invalidateQueries({ queryKey: ["patient_notes", tenantId, patientId] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Practitioner notes</h3>
          <p className="text-xs text-muted-foreground">Clinical · allergy · private · general</p>
        </div>
        <Button size="sm" onClick={openAdd} data-testid="add-note-button">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add note
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No notes yet. Add the first one.</CardContent></Card>
      ) : (
        <div className="space-y-2" data-testid="patient-notes-list">
          {notes.map(n => (
            <Card key={n.id} data-testid={`note-row-${n.id}`}>
              <CardContent className="py-3 px-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLOR[n.note_type || "general"]}`}>{n.note_type || "general"}</Badge>
                    {n.is_private && <Badge variant="outline" className="text-[10px]"><Lock className="h-2.5 w-2.5 mr-0.5" />private</Badge>}
                    <span className="text-[11px] text-muted-foreground">{formatDate(n.created_at, "short")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(n)} data-testid={`note-edit-${n.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(n)} data-testid={`note-delete-${n.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-md" data-testid="add-note-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit note" : "Add note"}</DialogTitle>
            <DialogDescription>{editing ? "Update this note" : "Add a new note for this patient"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pn-type">Type</Label>
              <select id="pn-type" data-testid="note-type-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pn-content">Content</Label>
              <Textarea id="pn-content" rows={5} data-testid="note-content-input" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" data-testid="note-private-input" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              Mark as private
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="note-save-submit">
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
