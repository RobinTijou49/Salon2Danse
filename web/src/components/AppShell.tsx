import { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Logo } from './Logo';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="2.5" /><path d="M8 17c1-2 7-2 8 0" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    qc.clear();
    navigate('/login');
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-paper md:max-w-5xl">
      {/* En-tête marque */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-brand px-4 pb-3 text-white md:px-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <Logo variant="light" />

        <div className="flex items-center gap-2">
          {user?.profile && (
            <nav className="mr-1 hidden items-center gap-1 md:flex">
              <TopLink to="/" label="Accueil" end />
              <TopLink to="/planning" label="Créneaux" />
              <TopLink to="/recap" label="Mon récap" />
            </nav>
          )}
          <button
            onClick={logout}
            aria-label="Déconnexion"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 ring-1 ring-white/25 hover:bg-white/10"
          >
            <LogoutIcon />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12">
        <div key={location.pathname} className="anim-in">{children}</div>
      </main>

      {/* Barre de navigation basse (mobile uniquement) */}
      {user?.profile && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-line bg-white md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <Tab to="/" end icon={<HomeIcon />} label="Accueil" />
          <Tab to="/planning" icon={<CalendarIcon />} label="Créneaux" />
          <Tab to="/recap" icon={<BadgeIcon />} label="Mon récap" />
        </nav>
      )}
    </div>
  );
}

function TopLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function Tab({ to, icon, label, end }: { to: string; icon: ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
          isActive ? 'text-brand' : 'text-muted'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
