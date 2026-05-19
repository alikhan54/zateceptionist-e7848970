import { useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

interface Tab {
  label: string;
  icon: string;
  path: string;
}

const defaultTabs: Tab[] = [
  { label: 'Home', icon: '🏠', path: '/dashboard' },
  { label: 'Inbox', icon: '💬', path: '/inbox' },
  { label: 'Leads', icon: '👥', path: '/customers' },
  { label: 'Tasks', icon: '📋', path: '/tasks' },
  { label: 'Sales', icon: '📈', path: '/sales/dashboard' },
];

// Smart Ledger minimal mobile tabs (Phase J mobile fix, 2026-05-19).
// Accounting-tenant non-master-admin users get accounting-relevant tabs.
const accountingTabs: Tab[] = [
  { label: 'Home',     icon: '🏠', path: '/accounting/dashboard' },
  { label: 'Clients',  icon: '👥', path: '/accounting/clients' },
  { label: 'Jobs',     icon: '💼', path: '/accounting/jobs' },
  { label: 'Invoices', icon: '📄', path: '/accounting/invoices' },
  { label: 'Inbox',    icon: '💬', path: '/inbox' },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAccountingPracticeUK, tenantConfig } = useTenant();
  const { isMasterAdmin } = useAuth();

  const accountantDeptEnabled =
    !!(tenantConfig?.features && (tenantConfig.features as Record<string, boolean>).accountant_dept === true);
  const useAccountingTabs =
    isAccountingPracticeUK && accountantDeptEnabled && !isMasterAdmin;
  const tabs: Tab[] = useAccountingTabs ? accountingTabs : defaultTabs;

  return (
    <>
      {/* Inline style tag to hide on desktop — cannot be purged by Tailwind.
          Also: when the SIDEBAR SHEET specifically is open on mobile, hide the bottom nav so
          the sheet's tap targets aren't blocked by the bottom nav strip (2026-05-19 Phase J mobile fix).
          Scoped to [data-sidebar="sidebar"] so it does NOT fire for other dialogs (e.g. the
          OnboardingFlow modal that still appears for non-accounting tenants on first login). */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .mobile-bottom-tabs { display: none !important; }
        }
        /* Hide bottom nav ONLY when the sidebar Sheet is open. Other Radix dialogs
           (onboarding tutorial, modal forms, confirm dialogs) keep the bottom nav visible. */
        body:has([data-sidebar="sidebar"][data-state="open"]) .mobile-bottom-tabs {
          display: none !important;
        }
      `}} />
      <nav
        className="mobile-bottom-tabs"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          backgroundColor: useAccountingTabs ? '#1e3a5f' : '#1a1a2e',
          borderTop: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          // z-40 — below Sheet's z-50 (when sidebar is open, sheet renders above us).
          // This prevents the bottom nav from intercepting taps that should land on sidebar buttons.
          zIndex: 40,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                height: '100%',
                border: 'none',
                background: 'none',
                color: isActive ? '#6366f1' : '#94a3b8',
                fontSize: '10px',
                cursor: 'pointer',
                padding: 0,
                WebkitTapHighlightColor: 'transparent',
                minHeight: '44px',
                minWidth: '44px',
              }}
              aria-label={tab.label}
            >
              <span style={{ fontSize: '20px', marginBottom: '2px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
