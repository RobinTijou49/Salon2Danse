import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Logo } from '../components/Logo';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export function AdminShell({ children }: { children: ReactNode }) {
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    qc.clear();
    navigate('/login');
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col bg-paper">
      <header
        className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 bg-brand px-4 pb-3 text-white md:px-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Admin
          </span>
        </div>
        <nav className="order-3 flex w-full gap-1 md:order-2 md:ml-4 md:w-auto">
          <Link to="/admin" label="Tableau de bord" />
          <Link to="/admin/volunteers" label="Bénévoles" />
          <Link to="/admin/audit" label="Journal" />
        </nav>
        <button
          onClick={logout}
          className="order-2 ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/25 hover:bg-white/10 md:order-3"
        >
          Déconnexion
        </button>
      </header>
      <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}

function Link({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      end={to === '/admin'}
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
