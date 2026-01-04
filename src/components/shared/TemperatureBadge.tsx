import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Flame, Thermometer, Snowflake } from "lucide-react";

type Temperature = "hot" | "warm" | "cold";

interface TemperatureBadgeProps {
  temperature: Temperature;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const temperatureConfig: Record<Temperature, { label: string; icon: typeof Flame; className: string }> = {
  hot: {
    label: "Hot",
    icon: Flame,
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  warm: {
    label: "Warm",
    icon: Thermometer,
    className: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  cold: {
    label: "Cold",
    icon: Snowflake,
    className: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

const iconSizes = {
  sm: 10,
  md: 12,
  lg: 14,
};

export function TemperatureBadge({ temperature, showIcon = true, size = "md", className }: TemperatureBadgeProps) {
  const config = temperatureConfig[temperature];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold border gap-1",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </Badge>
  );
}
