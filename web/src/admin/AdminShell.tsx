import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Logo } from '../components/Logo';
import { Select } from '../components/Select';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { AdminEditionProvider, useEdition } from './editionContext';

export function AdminShell() {
  const { setUser } = useAuth();
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
    <AdminEditionProvider>
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
            <Link to="/admin/slots" label="Créneaux" />
            <Link to="/admin/editions" label="Éditions" />
            <Link to="/admin/audit" label="Journal" />
          </nav>
          <div className="order-2 ml-auto flex items-center gap-2 md:order-3">
            <EditionSelect />
            <button
              onClick={logout}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/25 hover:bg-white/10"
            >
              Déconnexion
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <div key={location.pathname} className="anim-in">
            <Outlet />
          </div>
        </main>
      </div>
    </AdminEditionProvider>
  );
}

function EditionSelect() {
  const { editionId, setEditionId, editions } = useEdition();
  if (editions.length <= 1) return null;
  return (
    <Select
      tone="brand"
      value={editionId ?? ''}
      onChange={setEditionId}
      options={editions.map((e) => ({
        value: e.id,
        label: e.name + (e.isArchived ? ' (archivée)' : ''),
      }))}
    />
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
