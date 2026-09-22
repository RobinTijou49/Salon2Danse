import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, MyPlanning } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner, Banner } from '../components/ui';

export function RecapPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['myPlanning'], queryFn: api.myPlanning });

  if (isLoading || !data) return <Spinner label="Chargement…" />;

  const byDay = groupByDay(data.items);
  const validated = data.planningStatus === 'VALIDATED';

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="eyebrow">Mon récapitulatif</span>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">
            {user?.profile?.firstName} {user?.profile?.lastName}
          </h1>
          <p className="text-sm text-muted">
            {data.count} créneau{data.count > 1 ? 'x' : ''} · {validated ? 'validé' : 'brouillon'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            validated ? 'bg-okbg text-ok' : 'bg-brand-50 text-brand'
          }`}
        >
          {validated ? 'Validé ✓' : 'Brouillon'}
        </span>
      </div>

      {data.count === 0 ? (
        <Banner tone="info">
          Tu n'as pas encore de créneau.{' '}
          <Link to="/planning" className="font-semibold underline">
            Compose ton planning
          </Link>
          .
        </Banner>
      ) : (
        <>
          {byDay.map(([day, items]) => (
            <div key={day} className="card overflow-hidden">
              <div className="border-b border-line bg-brand-50 px-4 py-2.5">
                <h2 className="font-display font-bold text-brand">{day}</h2>
              </div>
              <ul className="divide-y divide-line">
                {items.map((it) => (
                  <li key={it.bookingId} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-[92px] shrink-0 font-display text-sm font-bold text-ink tabular-nums">
                      {it.startTime}
                      <span className="block text-xs font-normal text-muted">→ {it.endTime}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{it.mission}</p>
                      {it.location && <p className="text-xs text-muted">{it.location}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <button onClick={() => window.print()} className="btn-ghost btn-block">
            🖨️ Imprimer / enregistrer en PDF
          </button>

          {!validated && (
            <Banner tone="warn">
              Ton planning n'est pas encore validé.{' '}
              <Link to="/planning" className="font-semibold underline">
                Valide-le
              </Link>{' '}
              pour confirmer tes créneaux.
            </Banner>
          )}
        </>
      )}
    </div>
  );
}

function groupByDay(items: MyPlanning['items']): [string, MyPlanning['items']][] {
  const map = new Map<string, MyPlanning['items']>();
  for (const it of items) {
    const arr = map.get(it.day) ?? [];
    arr.push(it);
    map.set(it.day, arr);
  }
  return [...map.entries()];
}
