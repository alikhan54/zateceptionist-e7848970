import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, FileImage, File as FileIcon, Download, Trash2, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PatientFile {
  id: string;
  file_name: string;
  file_type: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  uploaded_at: string;
  description: string | null;
  is_archived: boolean;
}

interface PatientFilesTabProps {
  patientId: string;
  tenantUuid: string;
}

const FILE_TYPES = ["lab_report", "imaging", "prescription_history", "insurance", "id_document", "other"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ICON_BY_EXT: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-5 w-5 text-rose-500" />,
  jpg: <FileImage className="h-5 w-5 text-sky-500" />,
  jpeg: <FileImage className="h-5 w-5 text-sky-500" />,
  png: <FileImage className="h-5 w-5 text-sky-500" />,
  webp: <FileImage className="h-5 w-5 text-sky-500" />,
  doc: <FileText className="h-5 w-5 text-indigo-500" />,
  docx: <FileText className="h-5 w-5 text-indigo-500" />,
};

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ICON_BY_EXT[ext] || <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

function fmtBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function PatientFilesTab({ patientId, tenantUuid }: PatientFilesTabProps) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("lab_report");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery<PatientFile[]>({
    queryKey: ["patient_files", tenantId, patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_patient_files" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("is_archived", false)
        .order("uploaded_at", { ascending: false });
      // Table-doesn't-exist → empty list (DDL might not be applied yet)
      if (error) {
        if (/relation .* does not exist|404/i.test(error.message)) return [];
        return [];
      }
      return (data || []) as unknown as PatientFile[];
    },
    enabled: !!tenantId && !!patientId,
  });

  const onPick = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) {
      toast({ title: "File too large", description: `Max ${(MAX_BYTES / 1024 / 1024)} MB`, variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) { toast({ title: "Choose a file first", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const ts = Date.now();
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const objPath = `patients/${tenantUuid}/${patientId}/${ts}_${safeName}`;
      const { error: upErr } = await supabase.storage.from("patient-files").upload(objPath, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(objPath);
      const { error: insErr } = await supabase.from("clinic_patient_files" as any).insert({
        tenant_id: tenantId,
        patient_id: patientId,
        file_name: file.name,
        file_type: fileType,
        file_url: urlData?.publicUrl || null,
        file_size_bytes: file.size,
        description: description.trim() || null,
      } as any);
      if (insErr) throw insErr;
      toast({ title: "File uploaded", description: file.name });
      setOpen(false); setFile(null); setDescription("");
      queryClient.invalidateQueries({ queryKey: ["patient_files", tenantId, patientId] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (f: PatientFile) => {
    try {
      await supabase.from("clinic_patient_files" as any).update({ is_archived: true } as any).eq("id", f.id).eq("tenant_id", tenantId);
      // Best-effort storage cleanup: extract path from URL
      if (f.file_url) {
        const idx = f.file_url.indexOf("/patient-files/");
        if (idx > -1) {
          const p = f.file_url.slice(idx + "/patient-files/".length);
          await supabase.storage.from("patient-files").remove([p]);
        }
      }
      toast({ title: "File deleted" });
      queryClient.invalidateQueries({ queryKey: ["patient_files", tenantId, patientId] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Patient files</h3>
          <p className="text-xs text-muted-foreground">Lab reports, imaging, insurance, ID</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} data-testid="upload-file-button">
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload file
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : files.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          No files yet. Upload one to get started.
        </CardContent></Card>
      ) : (
        <div className="grid gap-2" data-testid="patient-files-list">
          {files.map(f => (
            <Card key={f.id} data-testid={`file-row-${f.id}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                {iconFor(f.file_name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.file_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    {f.file_type && <Badge variant="outline" className="text-[10px]">{f.file_type}</Badge>}
                    <span>{fmtBytes(f.file_size_bytes)}</span>
                    <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{formatDate(f.uploaded_at, "short")}</span>
                  </p>
                  {f.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{f.description}</p>}
                </div>
                {f.file_url && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                    <a href={f.file_url} target="_blank" rel="noopener noreferrer" download><Download className="h-4 w-4" /></a>
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(f)} data-testid={`file-delete-${f.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setFile(null); } }}>
        <DialogContent className="max-w-md" data-testid="upload-file-dialog">
          <DialogHeader>
            <DialogTitle>Upload patient file</DialogTitle>
            <DialogDescription>PDF, JPG, PNG, DOCX · max 10 MB</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-file">File</Label>
              <Input id="pf-file" type="file" accept=".pdf,image/jpeg,image/png,image/webp,.doc,.docx" onChange={(e) => onPick(e.target.files?.[0] ?? null)} data-testid="upload-file-input" />
              {file && <p className="text-xs text-muted-foreground">{file.name} · {fmtBytes(file.size)}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-type">Type</Label>
              <select id="pf-type" data-testid="upload-file-type-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={fileType} onChange={(e) => setFileType(e.target.value)}>
                {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-desc">Description (optional)</Label>
              <Textarea id="pf-desc" rows={2} data-testid="upload-file-description-input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading || !file} data-testid="upload-file-submit">
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
