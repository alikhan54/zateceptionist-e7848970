import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => ReactNode;
  mobileLabel?: string;
  hideOnMobile?: boolean;
  className?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyState?: {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  onRowClick?: (item: T) => void;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  emptyState,
  onRowClick,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && emptyState) {
    return (
      <EmptyState
        type="data"
        title={emptyState.title}
        description={emptyState.description}
        actionLabel={emptyState.actionLabel}
        onAction={emptyState.onAction}
      />
    );
  }

  // Mobile: Card layout
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((item) => (
          <Card
            key={keyExtractor(item)}
            className={cn(
              "transition-colors",
              onRowClick && "cursor-pointer hover:bg-muted/50"
            )}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4 space-y-3">
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((column) => (
                  <div
                    key={column.key}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-muted-foreground">
                      {column.mobileLabel || column.header}
                    </span>
                    <div className="text-sm font-medium text-right">
                      {column.cell(item)}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div className={cn("rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
