import { type LucideIcon } from "lucide-react";

interface FeatureBannerProps {
  icon: LucideIcon;
  title: string;
  description: string;
  stat?: string;
  statLabel?: string;
}

export function FeatureBanner({ icon: Icon, title, description, stat, statLabel }: FeatureBannerProps) {
  return (
    <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        {stat && (
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary">{stat}</p>
            {statLabel && <p className="text-xs text-muted-foreground">{statLabel}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
