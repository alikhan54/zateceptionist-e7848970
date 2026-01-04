import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface LeadScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getScoreConfig(score: number): { label: string; className: string } {
  if (score >= 76) {
    return { label: "Excellent", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  }
  if (score >= 51) {
    return { label: "Good", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" };
  }
  if (score >= 26) {
    return { label: "Fair", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  }
  return { label: "Low", className: "bg-red-500/15 text-red-600 border-red-500/30" };
}

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
};

export function LeadScoreBadge({ score, showLabel = false, size = "md", className }: LeadScoreBadgeProps) {
  const config = getScoreConfig(score);
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold border",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {clampedScore}
      {showLabel && <span className="ml-1 opacity-80">• {config.label}</span>}
    </Badge>
  );
}
