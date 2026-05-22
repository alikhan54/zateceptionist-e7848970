import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface BlogLike {
  id: string;
  title?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
  excerpt?: string | null;
  primary_keyword?: string | null;
  meta_description?: string | null;
}

interface EditBlogDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: BlogLike | null;
}

const STATUSES = ["draft", "scheduled", "published", "archived"];

export function EditBlogDialog({ open, onOpenChange, post }: EditBlogDialogProps) {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    if (open && post) {
      setTitle(post.title || "");
      setStatus(post.status || "draft");
      setScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : "");
      setExcerpt(post.excerpt || "");
      setPrimaryKeyword(post.primary_keyword || "");
      setMetaDescription(post.meta_description || "");
    }
  }, [open, post]);

  const update = useMutation({
    mutationFn: async () => {
      if (!post?.id) throw new Error("No post");
      const updates: any = {
        title: title.trim() || post.title,
        status,
        excerpt: excerpt.trim() || null,
        primary_keyword: primaryKeyword.trim() || null,
        meta_description: metaDescription.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (scheduledAt) updates.scheduled_at = new Date(scheduledAt).toISOString();
      const { error } = await supabase
        .from("blog_posts" as any)
        .update(updates)
        .eq("id", post.id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog_posts"] });
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast({ title: "Blog post updated" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Could not update", description: e?.message || "Unknown error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="edit-blog-dialog">
        <DialogHeader>
          <DialogTitle>Edit blog post</DialogTitle>
          <DialogDescription>{post?.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="eb-title">Title</Label>
            <Input id="eb-title" data-testid="edit-blog-title-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eb-status">Status</Label>
              <select id="eb-status" data-testid="edit-blog-status-input" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eb-scheduled">Scheduled at</Label>
              <Input id="eb-scheduled" type="datetime-local" data-testid="edit-blog-scheduled-input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eb-keyword">Primary keyword</Label>
            <Input id="eb-keyword" data-testid="edit-blog-keyword-input" value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eb-excerpt">Excerpt</Label>
            <Textarea id="eb-excerpt" rows={3} data-testid="edit-blog-excerpt-input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eb-meta">Meta description</Label>
            <Textarea id="eb-meta" rows={2} data-testid="edit-blog-meta-input" value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending} data-testid="edit-blog-submit">
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
