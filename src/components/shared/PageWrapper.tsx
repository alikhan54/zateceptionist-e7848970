import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './ErrorBoundary';
import { CardSkeleton, TableSkeleton, StatsSkeleton } from './LoadingSkeleton';

interface PageWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  loadingType?: 'cards' | 'table' | 'stats' | 'custom';
  loadingCount?: number;
  className?: string;
}

export function PageWrapper({
  children,
  title,
  description,
  actions,
  isLoading = false,
  loadingType = 'cards',
  loadingCount = 4,
  className,
}: PageWrapperProps) {
  const renderSkeleton = () => {
    switch (loadingType) {
      case 'table':
        return <TableSkeleton rows={loadingCount} />;
      case 'stats':
        return (
          <div className="space-y-6">
            <StatsSkeleton count={4} />
            <TableSkeleton rows={5} />
          </div>
        );
      case 'cards':
      default:
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: loadingCount }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className={cn("space-y-6", className)}>
        {/* Page Header */}
        {(title || actions) && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}

        {/* Content */}
        {isLoading ? renderSkeleton() : children}
      </div>
    </ErrorBoundary>
  );
}
