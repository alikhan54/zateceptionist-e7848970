import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Inbox, 
  Search, 
  FileX, 
  Users, 
  MessageSquare,
  Calendar,
  BarChart3,
  type LucideIcon 
} from "lucide-react";

type EmptyStateType = "inbox" | "search" | "data" | "users" | "messages" | "calendar" | "analytics" | "custom";

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const typeIcons: Record<EmptyStateType, LucideIcon> = {
  inbox: Inbox,
  search: Search,
  data: FileX,
  users: Users,
  messages: MessageSquare,
  calendar: Calendar,
  analytics: BarChart3,
  custom: FileX,
};

const sizeConfig = {
  sm: {
    container: "py-6",
    iconWrapper: "h-10 w-10",
    iconSize: 20,
    title: "text-sm font-medium",
    description: "text-xs",
    button: "h-8 text-xs",
  },
  md: {
    container: "py-10",
    iconWrapper: "h-14 w-14",
    iconSize: 28,
    title: "text-base font-semibold",
    description: "text-sm",
    button: "h-9 text-sm",
  },
  lg: {
    container: "py-16",
    iconWrapper: "h-20 w-20",
    iconSize: 40,
    title: "text-xl font-semibold",
    description: "text-base",
    button: "h-10 text-sm",
  },
};

export function EmptyState({
  type = "data",
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  size = "md",
}: EmptyStateProps) {
  const Icon = icon || typeIcons[type];
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        config.container,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted mb-4",
          config.iconWrapper
        )}
      >
        <Icon size={config.iconSize} className="text-muted-foreground" />
      </div>

      <h3 className={cn("text-foreground mb-1", config.title)}>{title}</h3>

      {description && (
        <p className={cn("text-muted-foreground max-w-sm mx-auto mb-4", config.description)}>
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2">
          {actionLabel && onAction && (
            <Button onClick={onAction} className={config.button}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction} className={config.button}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
