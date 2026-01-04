import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({ message = 'Loading...', className }: PageLoadingProps) {
  return (
    <div className={cn("min-h-[400px] flex items-center justify-center", className)}>
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
