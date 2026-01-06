import { forwardRef, ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Skip link for keyboard navigation
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
    >
      Skip to main content
    </a>
  );
}

// Visually hidden text for screen readers
interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}

// Focus trap wrapper
interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function FocusTrap({ children, active = true, className }: FocusTrapProps) {
  if (!active) return <>{children}</>;

  return (
    <div
      className={className}
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          const focusableElements = e.currentTarget.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }}
    >
      {children}
    </div>
  );
}

// Live region for announcements
interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export function LiveRegion({ message, politeness = 'polite' }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

// Accessible icon button
interface AccessibleIconButtonProps extends HTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}

export const AccessibleIconButton = forwardRef<HTMLButtonElement, AccessibleIconButtonProps>(
  ({ icon, label, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

AccessibleIconButton.displayName = 'AccessibleIconButton';

// Accessible data table wrapper
interface AccessibleTableProps {
  children: ReactNode;
  caption: string;
  className?: string;
}

export function AccessibleTable({ children, caption, className }: AccessibleTableProps) {
  return (
    <div className={cn("relative overflow-auto", className)} role="region" aria-label={caption}>
      <table className="w-full caption-bottom text-sm">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

// Loading state with proper announcements
interface AccessibleLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function AccessibleLoading({ isLoading, loadingText = 'Loading...', children }: AccessibleLoadingProps) {
  return (
    <>
      <LiveRegion message={isLoading ? loadingText : ''} />
      <div aria-busy={isLoading}>
        {children}
      </div>
    </>
  );
}

// Progress indicator with proper labels
interface AccessibleProgressProps {
  value: number;
  max?: number;
  label: string;
  className?: string;
}

export function AccessibleProgress({ value, max = 100, label, className }: AccessibleProgressProps) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className={className}>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${percentage}%`}
        className="h-2 bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Image with lazy loading
interface LazyImageProps extends HTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
}

export function LazyImage({ src, alt, fallback, className, ...props }: LazyImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        if (fallback) {
          e.currentTarget.src = fallback;
        }
      }}
      className={cn("object-cover", className)}
      {...props}
    />
  );
}
