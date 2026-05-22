import { Button } from "@/components/ui/button";
import { Trash2, Archive, X } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  /** custom CTA — appears before Archive/Delete */
  customAction?: { label: string; icon?: React.ReactNode; onClick: () => void; testid?: string };
  busy?: boolean;
  entityNoun?: string;
}

/**
 * Phase 11 Group C — bulk action bar.
 *
 * Renders as a sticky bottom-strip whenever count > 0. Stays out of the
 * way otherwise.
 */
export function BulkActionBar({ count, onClear, onArchive, onDelete, customAction, busy, entityNoun = "item" }: BulkActionBarProps) {
  if (count <= 0) return null;
  const noun = count === 1 ? entityNoun : `${entityNoun}s`;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border bg-background/95 shadow-xl px-4 py-2 backdrop-blur"
      data-testid="bulk-action-bar"
    >
      <span className="text-sm font-medium" data-testid="bulk-action-count">{count} {noun} selected</span>
      {customAction && (
        <Button size="sm" variant="outline" onClick={customAction.onClick} disabled={busy} data-testid={customAction.testid || "bulk-custom"}>
          {customAction.icon}
          <span className={customAction.icon ? "ml-1.5" : ""}>{customAction.label}</span>
        </Button>
      )}
      {onArchive && (
        <Button size="sm" variant="outline" onClick={onArchive} disabled={busy} data-testid="bulk-archive">
          <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
        </Button>
      )}
      {onDelete && (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} disabled={busy} data-testid="bulk-delete">
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onClear} disabled={busy} data-testid="bulk-clear">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
