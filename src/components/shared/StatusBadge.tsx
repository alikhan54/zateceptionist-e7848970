import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StatusVariant = "success" | "warning" | "error" | "info" | "default" | "muted";

interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

interface StatusBadgeProps {
  status: string;
  statusMap?: Record<string, StatusConfig>;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  error: "bg-red-500/15 text-red-600 border-red-500/30",
  info: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  default: "bg-primary/15 text-primary border-primary/30",
  muted: "bg-muted text-muted-foreground border-border",
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

// Default status mappings for common statuses
const defaultStatusMap: Record<string, StatusConfig> = {
  // General
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "muted" },
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "error" },
  
  // Leads
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "default" },
  qualified: { label: "Qualified", variant: "success" },
  converted: { label: "Converted", variant: "success" },
  lost: { label: "Lost", variant: "error" },
  
  // Tasks
  todo: { label: "To Do", variant: "muted" },
  in_progress: { label: "In Progress", variant: "info" },
  done: { label: "Done", variant: "success" },
  
  // Appointments
  scheduled: { label: "Scheduled", variant: "info" },
  confirmed: { label: "Confirmed", variant: "success" },
  no_show: { label: "No Show", variant: "error" },
  
  // Campaigns
  draft: { label: "Draft", variant: "muted" },
  scheduled_campaign: { label: "Scheduled", variant: "info" },
  sending: { label: "Sending", variant: "warning" },
  sent: { label: "Sent", variant: "success" },
  
  // Conversations
  open: { label: "Open", variant: "info" },
  resolved: { label: "Resolved", variant: "success" },
  waiting: { label: "Waiting", variant: "warning" },
};

export function StatusBadge({ status, statusMap, size = "md", className }: StatusBadgeProps) {
  const mergedStatusMap = { ...defaultStatusMap, ...statusMap };
  const config = mergedStatusMap[status.toLowerCase()] || { 
    label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " "), 
    variant: "muted" as StatusVariant 
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border capitalize",
        variantClasses[config.variant],
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
