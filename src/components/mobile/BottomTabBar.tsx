import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { label: 'Home', icon: '🏠', path: '/dashboard' },
  { label: 'Inbox', icon: '💬', path: '/inbox' },
  { label: 'Leads', icon: '👥', path: '/customers' },
  { label: 'Tasks', icon: '📋', path: '/tasks' },
  { label: 'Sales', icon: '📈', path: '/sales/dashboard' },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Inline style tag to hide on desktop — cannot be purged by Tailwind */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 768px) {
          .mobile-bottom-tabs { display: none !important; }
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
          backgroundColor: '#1a1a2e',
          borderTop: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 999999,
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
