import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Recycle } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { callWebhook } from "@/lib/api/webhooks";
import { useToast } from "@/hooks/use-toast";

interface RepurposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: string;
  sourceId: string;
  sourceTitle: string;
}

const TARGET_OPTIONS = [
  { id: "social_post", label: "Social Posts", description: "3 platform-optimized posts" },
  { id: "email_campaign", label: "Email Campaign", description: "Newsletter-style email" },
  { id: "blog_post", label: "Blog Post", description: "Expanded article" },
  { id: "video_project", label: "Video Script", description: "60-second video script" },
];

export function RepurposeDialog({ open, onOpenChange, sourceType, sourceId, sourceTitle }: RepurposeDialogProps) {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const toggleTarget = (id: string) => {
    setSelectedTargets(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleRepurpose = async () => {
    if (!selectedTargets.length || !tenantConfig) return;
    setIsProcessing(true);
    setResults(null);
    try {
      const res = await callWebhook("/marketing/repurpose-content", {
        source_type: sourceType,
        source_id: sourceId,
        target_types: selectedTargets,
      }, tenantConfig.id);
      if (res.success && res.data) {
        const data = res.data as any;
        setResults(data.results || []);
        toast({ title: "Content repurposed!", description: `Created ${(data.results || []).length} items` });
      } else {
        toast({ title: "Repurpose failed", description: res.error || "Unknown error", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) { setResults(null); setSelectedTargets([]); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Recycle className="h-5 w-5" /> Repurpose Content</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">
          Source: <span className="font-medium">{sourceTitle}</span>
        </p>

        {!results ? (
          <>
            <div className="space-y-3">
              {TARGET_OPTIONS.filter(t => t.id !== sourceType).map(target => (
                <label key={target.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedTargets.includes(target.id)}
                    onCheckedChange={() => toggleTarget(target.id)}
                    disabled={isProcessing}
                  />
                  <div>
                    <p className="font-medium text-sm">{target.label}</p>
                    <p className="text-xs text-muted-foreground">{target.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>Cancel</Button>
              <Button onClick={handleRepurpose} disabled={!selectedTargets.length || isProcessing}>
                {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : "Repurpose Now"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-2">
            {results.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded border">
                {r.error ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <span className="text-sm font-medium">{r.type?.replace('_', ' ')}</span>
                {r.count && <Badge variant="secondary">{r.count} created</Badge>}
                {r.error && <span className="text-xs text-destructive">{r.error}</span>}
              </div>
            ))}
            <DialogFooter className="mt-4">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
