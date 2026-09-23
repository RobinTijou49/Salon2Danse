import { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Logo } from '../components/Logo';
import { Select } from '../components/Select';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { AdminEditionProvider, useEdition } from './editionContext';

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 5a3 3 0 0 1 0 6" /><path d="M17 20c0-2-1-3.5-2.5-4.5" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" />
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
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" />
    </svg>
  );
}

const NAV = [
  { to: '/admin', label: 'Bord', full: 'Tableau de bord', icon: <GridIcon />, end: true },
  { to: '/admin/volunteers', label: 'Bénévoles', full: 'Bénévoles', icon: <UsersIcon /> },
  { to: '/admin/slots', label: 'Créneaux', full: 'Créneaux', icon: <ClockIcon /> },
  { to: '/admin/editions', label: 'Éditions', full: 'Éditions', icon: <LayersIcon /> },
  { to: '/admin/audit', label: 'Journal', full: 'Journal', icon: <ListIcon /> },
];

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
          className="sticky top-0 z-30 flex items-center gap-x-4 gap-y-2 bg-brand px-4 pb-3 text-white md:flex-wrap md:px-8"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              Admin
            </span>
          </div>

          {/* Nav en ligne (desktop uniquement) */}
          <nav className="hidden gap-1 md:order-2 md:ml-4 md:flex">
            {NAV.map((n) => (
              <TopLink key={n.to} to={n.to} label={n.full} end={n.end} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:order-3">
            <EditionSelect />
            <button
              onClick={logout}
              aria-label="Déconnexion"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 ring-1 ring-white/25 hover:bg-white/10"
            >
              <LogoutIcon />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8">
          <div key={location.pathname} className="anim-in">
            <Outlet />
          </div>
        </main>

        {/* Barre de navigation basse (mobile uniquement) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-6xl border-t border-line bg-white md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {NAV.map((n) => (
            <BottomTab key={n.to} to={n.to} label={n.label} icon={n.icon} end={n.end} />
          ))}
        </nav>
      </div>
    </AdminEditionProvider>
  );
}

function TopLink({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink
      end={end}
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

function BottomTab({ to, label, icon, end }: { to: string; label: string; icon: ReactNode; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
          isActive ? 'text-brand' : 'text-muted'
        }`
      }
    >
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </NavLink>
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
