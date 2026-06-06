// BrandedLogo — the sidebar brand header (logo + name + industry), white-label aware.
// Drop-in replacement for the inline logo block in NavigationSidebar (SidebarHeader).
// Behaviour-identical to the previous block, but reads brandName (brand_name ?? company_name)
// and logo via useTenantBranding.
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenantBranding } from "@/hooks/useTenantBranding";

export function BrandedLogo({ collapsed = false }: { collapsed?: boolean }) {
  const { brandName, logoUrl, industry } = useTenantBranding();
  const initial = brandName?.charAt(0)?.toUpperCase() || "Z";

  return (
    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
      {logoUrl ? (
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={logoUrl} alt={brandName} />
          <AvatarFallback className="bg-primary text-primary-foreground">{initial}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      {!collapsed && (
        <div className="flex flex-col overflow-hidden">
          <span className="font-semibold text-sm truncate">{brandName}</span>
          <span className="text-xs text-muted-foreground truncate">
            {industry ? String(industry).replace(/_/g, " ") : "Business Hub"}
          </span>
        </div>
      )}
    </div>
  );
}
