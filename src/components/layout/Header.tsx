import { Button } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { CommandPalette } from '@/components/global/CommandPalette';
import { NotificationCenter } from '@/components/global/NotificationCenter';
import { HelpSupport } from '@/components/global/HelpSupport';
import { ThemeToggle } from '@/components/global/ThemeToggle';
import { AIControlCenter } from '@/components/AIControlCenter';
import { OmegaAlertBell } from '@/components/OmegaAlertBell';

export function Header() {
  const { user, signOut } = useAuth();
  const { tenantConfig } = useTenant();
  // Phase 13.A — mobile-recognizable hamburger. shadcn's <SidebarTrigger>
  // uses a PanelLeft icon which Bangladesh/iOS users didn't recognize as a
  // menu opener. We add a parallel button with a Menu (3-bar) icon visible
  // only on mobile, wired to the SAME useSidebar() toggle. Desktop keeps
  // the original PanelLeft trigger.
  const { toggleSidebar } = useSidebar();

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 sticky top-0 z-50 gap-4">
      {/* Mobile: 3-bar hamburger (recognizable everywhere) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden mr-2"
        onClick={toggleSidebar}
        aria-label="Open menu"
        data-testid="mobile-nav-trigger"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {/* Desktop: original sidebar-toggle trigger */}
      <SidebarTrigger className="mr-2 hidden md:inline-flex" />
      
      <div className="flex-1 max-w-md">
        <CommandPalette />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <AIControlCenter />
        <OmegaAlertBell />
        <ThemeToggle />
        <HelpSupport />
        <NotificationCenter />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{tenantConfig?.company_name || 'Business'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}