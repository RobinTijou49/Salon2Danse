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
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-paper">
      {/* En-tête marque */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between bg-brand px-4 pb-3 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <Logo variant="light" />
        <button
          onClick={logout}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/25 hover:bg-white/10"
        >
          Déconnexion
        </button>
      </header>

      <main className="flex-1 px-4 pb-28 pt-5">{children}</main>

      {/* Barre de navigation basse (mobile-first) */}
      {user?.profile && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-line bg-white"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <Tab to="/planning" icon={<CalendarIcon />} label="Planning" />
          <Tab to="/recap" icon={<ListIcon />} label="Mon récap" />
        </nav>
      )}
    </div>
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
