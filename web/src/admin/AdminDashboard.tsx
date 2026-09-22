import { useQuery } from '@tanstack/react-query';
import { admin } from '../lib/api';
import { Spinner } from '../components/ui';

export function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: admin.stats });
  if (isLoading || !data) return <Spinner label="Chargement…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Supervision</span>
          <h1 className="text-2xl font-extrabold text-ink">Tableau de bord</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={admin.exports.xlsx} className="btn-primary px-4 py-2 text-sm">⬇ Excel</a>
          <a href={admin.exports.volunteersCsv} className="btn-ghost px-4 py-2 text-sm">CSV bénévoles</a>
          <a href={admin.exports.planningCsv} className="btn-ghost px-4 py-2 text-sm">CSV planning</a>
        </div>
      </div>

      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bénévoles inscrits" value={data.totalVolunteers} />
        <Stat label="Plannings validés" value={data.planningValidated} tone="ok" />
        <Stat label="En attente" value={data.planningDraft} tone="warn" />
        <Stat label="Taux de remplissage" value={`${data.fillRate}%`} />
      </div>
      {data.minorsPending > 0 && (
        <div className="rounded-xl border border-warn/25 bg-warnbg px-4 py-3 text-sm text-warn">
          {data.minorsPending} profil(s) mineur(s) en attente de validation.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Remplissage par jour */}
        <div className="card p-5">
          <h2 className="mb-3 text-base font-bold text-ink">Remplissage par jour</h2>
          <div className="space-y-3">
            {data.perDay.map((d) => (
              <Bar key={d.label} label={d.label} rate={d.rate} sub={`${d.taken}/${d.capacity}`} />
            ))}
          </div>
        </div>

        {/* Créneaux en sous-effectif */}
        <div className="card p-5">
          <h2 className="mb-3 text-base font-bold text-ink">Créneaux à renforcer</h2>
          {data.understaffed.length === 0 ? (
            <p className="text-sm text-muted">Tout est pourvu 🎉</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.understaffed.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{s.mission}</span>
                    <span className="block text-xs text-muted">{s.day} · {s.time}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-warnbg px-2.5 py-1 text-xs font-bold text-warn">
                    {s.remaining} à pourvoir
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Remplissage par mission */}
      <div className="card p-5">
        <h2 className="mb-3 text-base font-bold text-ink">Remplissage par mission</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.perMission.map((m) => (
            <Bar key={m.name} label={m.name} rate={m.rate} sub={`${m.taken}/${m.capacity}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-brand';
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

function Bar({ label, rate, sub }: { label: string; rate: number; sub: string }) {
  const color = rate >= 80 ? 'bg-ok' : rate >= 40 ? 'bg-warn' : 'bg-brand';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="truncate font-medium text-ink">{label}</span>
        <span className="shrink-0 text-xs text-muted tabular-nums">{sub} · {rate}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${color}`} style={{ width: `${rate}%` }} />
      </div>
    </div>
  );
}
