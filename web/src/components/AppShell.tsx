import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Logo } from './Logo';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

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
          {/* Navigation en ligne (desktop) */}
          {user?.profile && (
            <nav className="mr-2 hidden items-center gap-1 md:flex">
              <TopLink to="/planning" label="Planning" />
              <TopLink to="/recap" label="Mon récap" />
            </nav>
          )}
          <button
            onClick={logout}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/25 hover:bg-white/10"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5 md:px-8 md:pb-12">{children}</main>

      {/* Barre de navigation basse (mobile uniquement) */}
      {user?.profile && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-line bg-white md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <Tab to="/planning" icon={<CalendarIcon />} label="Planning" />
          <Tab to="/recap" icon={<ListIcon />} label="Mon récap" />
        </nav>
      )}
    </div>
  );
}

function TopLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
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

function Tab({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
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
