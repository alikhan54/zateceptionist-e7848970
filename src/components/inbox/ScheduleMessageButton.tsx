import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleMessageButtonProps {
  conversationId: string;
  tenantId: string;
  messageInput: string;
  channel: string;
  onScheduled: () => void;
}

export function ScheduleMessageButton({
  conversationId,
  tenantId,
  messageInput,
  channel,
  onScheduled,
}: ScheduleMessageButtonProps) {
  const [open, setOpen] = useState(false);
  const [datetime, setDatetime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    if (!datetime || !messageInput.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("scheduled_messages" as any).insert({
        tenant_id: tenantId,
        conversation_id: conversationId,
        content: messageInput.trim(),
        channel,
        scheduled_at: new Date(datetime).toISOString(),
        status: "scheduled",
        created_by: "agent",
      });
      if (error) throw error;
      toast.success(`Message scheduled for ${new Date(datetime).toLocaleString()}`);
      setOpen(false);
      setDatetime("");
      onScheduled();
    } catch (err: any) {
      toast.error(`Failed to schedule: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Min datetime = now + 1 minute
  const minDate = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={!messageInput.trim()}
          title="Schedule message"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">Schedule Message</p>
          <input
            type="datetime-local"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            min={minDate}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSchedule}
              disabled={!datetime || loading}
            >
              {loading ? "Scheduling..." : "Schedule"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
