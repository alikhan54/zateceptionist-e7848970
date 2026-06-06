// LogoUpload — drag/drop or click to upload a tenant logo.
// Validates type (PNG/SVG/JPG) + size (<2MB), uploads to Storage bucket `tenant-logos/<tenant_id>/`,
// persists the public URL to tenant_config.logo_url, then refreshes TenantContext.
// NOTE (infra): requires a public-read `tenant-logos` Storage bucket (own-tenant write). Flagged for 1A.D setup.
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/svg+xml", "image/jpeg"];

interface LogoUploadProps {
  currentUrl?: string | null;
  onUploaded?: (url: string) => void;
  compact?: boolean;
}

export function LogoUpload({ currentUrl, onUploaded, compact = false }: LogoUploadProps) {
  const { tenantId, refreshConfig } = useTenant();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  const handleFile = async (file: File | undefined | null) => {
    if (!file || !tenantId) return;
    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Unsupported file", description: "Use a PNG, SVG, or JPG image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Logo must be under 2 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${tenantId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("tenant-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("tenant-logos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("tenant_config")
        .update({ logo_url: url })
        .eq("tenant_id", tenantId);
      if (dbErr) throw dbErr;
      setPreview(url);
      onUploaded?.(url);
      await refreshConfig();
      toast({ title: "Logo updated" });
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Could not upload the logo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-dashed p-4 cursor-pointer transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        compact && "p-3",
      )}
      data-testid="logo-upload"
    >
      <div className="h-12 w-12 rounded-xl overflow-hidden bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
        {preview ? <img src={preview} alt="logo" className="h-full w-full object-contain" /> : (uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />)}
      </div>
      <div className="text-sm min-w-0">
        <div className="text-foreground">{uploading ? "Uploading…" : "Drag & drop, or click to upload"}</div>
        <div className="text-xs text-muted-foreground truncate">PNG · SVG · JPG · up to 2&nbsp;MB</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
