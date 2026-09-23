import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, MyPlanning } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner, Banner } from '../components/ui';
import { missionIcon } from '../lib/missionIcons';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function icsStamp(dateIso: string, hhmm: string) {
  const d = new Date(dateIso);
  const [h, m] = hhmm.split(':');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(+h)}${pad(+m)}00`;
}
function downloadIcs(items: MyPlanning['items']) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Salon de la Danse//Benevoles//FR'];
  for (const it of items) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${it.bookingId}@salondeladanse`,
      `DTSTART:${icsStamp(it.date, it.startTime)}`,
      `DTEND:${icsStamp(it.date, it.endTime)}`,
      `SUMMARY:Bénévole — ${it.mission}`,
      `LOCATION:${it.location || "Centre de Congrès d'Angers"}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'salon-danse-planning.ics';
  a.click();
  URL.revokeObjectURL(url);
}

export function RecapPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['myPlanning'], queryFn: api.myPlanning });

  if (isLoading || !data) return <Spinner label="Chargement…" />;

  const byDay = groupByDay(data.items);
  const validated = data.planningStatus === 'VALIDATED';

  return (
    <div className="space-y-5">
      <div>
        <span className="eyebrow">Mon récapitulatif</span>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-ink">
            {user?.profile?.firstName} {user?.profile?.lastName}
          </h1>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              validated ? 'bg-okbg text-ok' : 'bg-brand-50 text-brand'
            }`}
          >
            {validated ? 'Validé ✓' : 'Brouillon'}
          </span>
        </div>
        <p className="text-sm text-muted">
          {data.count} créneau{data.count > 1 ? 'x' : ''} ·{' '}
          {validated ? 'planning validé et verrouillé' : 'planning en brouillon'}
        </p>
      </div>

      {data.count === 0 ? (
        <Banner tone="info">
          Tu n'as pas encore de créneau.{' '}
          <Link to="/planning" className="font-semibold underline">Compose ton planning</Link>.
        </Banner>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {byDay.map(([day, items]) => (
              <div key={day} className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line bg-brand-50 px-4 py-2.5">
                  <span>🗓️</span>
                  <h2 className="font-display font-bold text-brand">{day}</h2>
                </div>
                <ul className="divide-y divide-line">
                  {items.map((it) => (
                    <li key={it.bookingId} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg">
                        {missionIcon(it.mission)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">{it.mission}</p>
                        {it.location && <p className="text-xs text-muted">📍 {it.location}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 font-display text-xs font-bold text-brand tabular-nums">
                        {it.startTime}→{it.endTime}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {validated && (
            <Banner tone="info">
              🔒 Ton planning est validé et verrouillé. Pour toute modification d'urgence, contacte le
              QG organisation.
            </Banner>
          )}

          <div className="space-y-3">
            <button onClick={() => window.print()} className="btn-primary btn-block">
              🖨️ Imprimer / télécharger mon planning
            </button>
            <button onClick={() => downloadIcs(data.items)} className="btn-ghost btn-block">
              📅 Ajouter à mon agenda (iCal / Google Calendar)
            </button>
          </div>

          {!validated && (
            <Banner tone="warn">
              Ton planning n'est pas encore validé.{' '}
              <Link to="/planning" className="font-semibold underline">Valide-le</Link> pour confirmer
              tes créneaux.
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
