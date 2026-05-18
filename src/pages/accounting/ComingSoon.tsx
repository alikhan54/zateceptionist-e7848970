import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Check } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  features: string[];
  icon: LucideIcon;
  expectedDate?: string;
}

export default function ComingSoon({
  title,
  description,
  features,
  icon: Icon,
  expectedDate = "Monday, 25 May 2026",
}: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-primary/30 bg-card/70">
        <CardHeader className="flex flex-col items-center gap-3 pb-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Icon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
            <CalendarClock className="h-3 w-3" />
            Launching {expectedDate}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-center text-muted-foreground">{description}</p>
          <ul className="mx-auto max-w-md space-y-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Today's capability demo shows the AI brain, database, and security. The visual workspace ships on the date above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
