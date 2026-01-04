import { useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useTenant } from "@/contexts/TenantContext";
import { switchHandler } from "@/lib/webhooks";
import { toast } from "sonner";
import { Bot, User, Loader2 } from "lucide-react";

interface HandlerToggleProps {
  entityId: string;
  entityType: "customer" | "conversation" | "lead";
  currentHandler: "ai" | "human";
  onToggle?: (newHandler: "ai" | "human") => void;
  showLabels?: boolean;
  showIcons?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function HandlerToggle({
  entityId,
  entityType,
  currentHandler,
  onToggle,
  showLabels = true,
  showIcons = true,
  size = "md",
  className,
}: HandlerToggleProps) {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [handler, setHandler] = useState(currentHandler);

  const handleToggle = async () => {
    if (!tenantId) {
      toast.error("Tenant not found");
      return;
    }

    setIsLoading(true);
    const newHandler = handler === "ai" ? "human" : "ai";

    try {
      await switchHandler(tenantId, entityId, entityType, newHandler);
      setHandler(newHandler);
      onToggle?.(newHandler);
      toast.success(`Switched to ${newHandler === "ai" ? "AI" : "Human"} handler`);
    } catch (error) {
      toast.error("Failed to switch handler");
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === "sm" ? 12 : 14;
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center gap-1 transition-colors",
          textSize,
          handler === "ai" ? "text-blue-500" : "text-muted-foreground"
        )}
      >
        {showIcons && <Bot size={iconSize} />}
        {showLabels && <span className="font-medium">AI</span>}
      </div>

      <div className="relative">
        <Switch
          checked={handler === "human"}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          className={cn(
            size === "sm" && "h-5 w-9 [&>span]:h-4 [&>span]:w-4 [&>span]:data-[state=checked]:translate-x-4"
          )}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={12} className="animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-1 transition-colors",
          textSize,
          handler === "human" ? "text-emerald-500" : "text-muted-foreground"
        )}
      >
        {showIcons && <User size={iconSize} />}
        {showLabels && <span className="font-medium">Human</span>}
      </div>
    </div>
  );
}
