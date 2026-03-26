import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GitMerge, Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const N8N_WEBHOOK_BASE = "https://webhooks.zatesystems.com/webhook";

interface MergeConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  tenantId: string;
  ticketNumber?: string;
  onMerged: () => void;
}

interface SearchResult {
  id: string;
  ticket_number: string;
  channel: string;
  status: string;
  last_message_text: string;
  message_count: number;
  created_at: string;
}

export function MergeConversationDialog({
  open,
  onOpenChange,
  conversationId,
  tenantId,
  ticketNumber,
  onMerged,
}: MergeConversationDialogProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("conversations")
        .select("id, ticket_number, channel, status, last_message_text, message_count, created_at")
        .eq("tenant_id", tenantId)
        .neq("id", conversationId)
        .neq("status", "merged")
        .or(`ticket_number.ilike.%${search}%,last_message_text.ilike.%${search}%`)
        .limit(10);
      setResults((data as any) || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selected) return;
    setMerging(true);
    try {
      const resp = await fetch(`${N8N_WEBHOOK_BASE}/comm-merge-conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primary_id: conversationId,
          merged_id: selected.id,
          tenant_id: tenantId,
          merged_by: "agent",
        }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Merged ${selected.ticket_number} into ${ticketNumber || "this conversation"}. ${data.messages_moved} messages moved.`);
        onOpenChange(false);
        onMerged();
      } else {
        toast.error(data.error || "Merge failed");
      }
    } catch {
      toast.error("Failed to merge conversations");
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Search for another conversation to merge into {ticketNumber || "this one"}.
            All messages will be combined.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Search by ticket # or message text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="icon" onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {results.map((r) => (
                <div
                  key={r.id}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    selected?.id === r.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{r.ticket_number}</span>
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{r.channel}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{r.message_count} msgs</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {r.last_message_text || "No messages"}
                  </p>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div className="flex items-center justify-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-sm font-medium">{selected.ticket_number}</p>
                <p className="text-[10px] text-muted-foreground">{selected.message_count} messages</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">{ticketNumber || "Current"}</p>
                <p className="text-[10px] text-muted-foreground">Primary</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMerge} disabled={!selected || merging}>
            <GitMerge className="h-4 w-4 mr-2" />
            {merging ? "Merging..." : "Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
