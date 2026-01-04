import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LEAD_GRADES } from "@/lib/constants";

type Grade = "A" | "B" | "C" | "D";

interface GradeBadgeProps {
  grade: Grade;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const gradeConfig: Record<Grade, { label: string; className: string }> = {
  A: {
    label: LEAD_GRADES.A.label,
    className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  },
  B: {
    label: LEAD_GRADES.B.label,
    className: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
  C: {
    label: LEAD_GRADES.C.label,
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  },
  D: {
    label: LEAD_GRADES.D.label,
    className: "bg-red-500/15 text-red-600 border-red-500/30",
  },
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5 min-w-5 justify-center",
  md: "text-xs px-2.5 py-0.5 min-w-6 justify-center",
  lg: "text-sm px-3 py-1 min-w-7 justify-center",
};

export function GradeBadge({ grade, showLabel = false, size = "md", className }: GradeBadgeProps) {
  const config = gradeConfig[grade];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-bold border",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {grade}
      {showLabel && <span className="ml-1 font-medium opacity-80">• {config.label}</span>}
    </Badge>
  );
}
