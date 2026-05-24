import { Shield } from 'lucide-react';

interface Props {
  pageName?: string;
}

/**
 * Reusable Settings access-restricted block. Renders when the current user's
 * role doesn't satisfy the page's entry in SETTINGS_PAGE_ACCESS.
 *
 * Mirrors the visual pattern used by Team.tsx's pre-existing gate so users
 * get a consistent "Access Restricted" experience across all Settings pages.
 */
export function AccessRestricted({ pageName }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Shield className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">Access Restricted</h2>
      <p className="text-muted-foreground mt-2 max-w-md">
        You don't have permission to view {pageName ?? 'this page'}.
        Contact your administrator to request access.
      </p>
    </div>
  );
}
