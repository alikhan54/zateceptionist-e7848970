import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function LiveClock({ className }: { className?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={className}>
      <p className="text-4xl font-bold tabular-nums tracking-tight">
        {format(time, 'HH:mm')}
        <span className="text-2xl text-muted-foreground animate-pulse">:{format(time, 'ss')}</span>
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {format(time, 'EEEE, MMMM d, yyyy')}
      </p>
    </div>
  );
}
