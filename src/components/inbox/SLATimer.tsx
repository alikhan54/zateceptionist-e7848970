import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SLATimerProps {
  slaDeadline?: string | null;
  createdAt?: string;
}

export function SLATimer({ slaDeadline, createdAt }: SLATimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!slaDeadline) return;

    const update = () => {
      const deadline = new Date(slaDeadline).getTime();
      const now = Date.now();
      setRemaining(Math.floor((deadline - now) / 60000)); // minutes
    };

    update();
    const interval = setInterval(update, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [slaDeadline]);

  if (!slaDeadline || remaining === null) return null;

  const breached = remaining < 0;
  const warning = remaining >= 0 && remaining <= 15;
  const ok = remaining > 15;

  const formatTime = (min: number) => {
    const abs = Math.abs(min);
    if (abs < 60) return `${abs}m`;
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
        ok && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        warning && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        breached && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      )}
    >
      {breached ? (
        <>
          <AlertTriangle className="h-3 w-3" />
          SLA breached {formatTime(remaining)} ago
        </>
      ) : (
        <>
          <Clock className="h-3 w-3" />
          {formatTime(remaining)} left
        </>
      )}
    </div>
  );
}
