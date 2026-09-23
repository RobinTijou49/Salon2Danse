import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { admin, ApiError, VolunteerRow } from '../lib/api';
import { Spinner, Banner } from '../components/ui';
import { useEdition } from './editionContext';

export function AdminVolunteers() {
  const { editionId } = useEdition();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [planning, setPlanning] = useState('');
  const [dayId, setDayId] = useState('');
  const [missionId, setMissionId] = useState('');
  const [minor, setMinor] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  const meta = useQuery({ queryKey: ['admin', 'meta'], queryFn: admin.meta });
  const params = { search, status, planning, dayId, missionId, editionId, minor, page };
  const list = useQuery({
    queryKey: ['admin', 'volunteers', params],
    queryFn: () => admin.volunteers(params),
  });

  const reset = () => {
    setSearch(''); setStatus(''); setPlanning(''); setDayId(''); setMissionId(''); setMinor(''); setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="eyebrow">Gestion</span>
        <h1 className="text-2xl font-extrabold text-ink">Bénévoles</h1>
      </div>

      {/* Filtres */}
      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input
            className="field"
            placeholder="Rechercher nom, prénom, e-mail…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="field" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Validation : toutes</option>
            <option value="PENDING">En attente</option>
            <option value="VALIDATED">Validé</option>
          </select>
          <select className="field" value={planning} onChange={(e) => { setPlanning(e.target.value); setPage(1); }}>
            <option value="">Planning : tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="VALIDATED">Validé</option>
          </select>
          <select className="field" value={dayId} onChange={(e) => { setDayId(e.target.value); setPage(1); }}>
            <option value="">Jour : tous</option>
            {meta.data?.days.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select className="field" value={missionId} onChange={(e) => { setMissionId(e.target.value); setPage(1); }}>
            <option value="">Mission : toutes</option>
            {meta.data?.missions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}{m.isPublic ? '' : ' (sensible)'}</option>
            ))}
          </select>
          <select className="field" value={minor} onChange={(e) => { setMinor(e.target.value); setPage(1); }}>
            <option value="">Tous les âges</option>
            <option value="true">Mineurs uniquement</option>
          </select>
          <button className="btn-ghost" onClick={reset}>Réinitialiser</button>
        </div>
      </div>

      {list.isLoading || !list.data ? (
        <Spinner />
      ) : (
        <>
          <p className="text-sm text-muted">{list.data.total} bénévole(s)</p>

          {/* Tableau (desktop) / cartes (mobile) */}
          <div className="card overflow-hidden">
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-brand-50 text-left text-xs uppercase tracking-wide text-brand">
                <tr>
                  <th className="px-4 py-2.5">Nom</th>
                  <th className="px-4 py-2.5">E-mail</th>
                  <th className="px-4 py-2.5">Validation</th>
                  <th className="px-4 py-2.5">Planning</th>
                  <th className="px-4 py-2.5">Créneaux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.items.map((v) => (
                  <tr key={v.id} className="cursor-pointer hover:bg-paper" onClick={() => setSelected(v.id)}>
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      {v.lastName.toUpperCase()} {v.firstName}
                      {v.isMinor && <span className="ml-1 text-xs text-warn">mineur</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{v.email}</td>
                    <td className="px-4 py-2.5"><Pill on={v.validationStatus === 'VALIDATED'} yes="Validé" no="En attente" /></td>
                    <td className="px-4 py-2.5"><Pill on={v.planningStatus === 'VALIDATED'} yes="Validé" no="Brouillon" /></td>
                    <td className="px-4 py-2.5 tabular-nums">{v.bookingsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-line md:hidden">
              {list.data.items.map((v) => (
                <li key={v.id} className="cursor-pointer px-4 py-3" onClick={() => setSelected(v.id)}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{v.lastName.toUpperCase()} {v.firstName}</span>
                    <span className="text-xs text-muted">{v.bookingsCount} créneaux</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="text-muted">{v.email}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Pill on={v.validationStatus === 'VALIDATED'} yes="Validé" no="En attente" />
                    <Pill on={v.planningStatus === 'VALIDATED'} yes="Planning validé" no="Brouillon" />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {list.data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button className="btn-ghost px-4 py-2 text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Précédent</button>
              <span className="text-sm text-muted">Page {list.data.page} / {list.data.pages}</span>
              <button className="btn-ghost px-4 py-2 text-sm" disabled={page >= list.data.pages} onClick={() => setPage((p) => p + 1)}>Suivant ›</button>
            </div>
          )}
        </>
      )}

      {selected && <VolunteerDrawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Pill({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${on ? 'bg-okbg text-ok' : 'bg-warnbg text-warn'}`}>
      {on ? yes : no}
    </span>
  );
}

function VolunteerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'detail', id], queryFn: () => admin.detail(id) });
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'detail', id] });
    qc.invalidateQueries({ queryKey: ['admin', 'volunteers'] });
    qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
  };
  const act = (fn: () => Promise<unknown>, ok: string) =>
    fn().then(() => { setMsg(ok); refresh(); }).catch((e) => setMsg(e instanceof ApiError ? e.message : 'Erreur.'));

  const validate = useMutation({ mutationFn: () => admin.validate(id) });
  const unlock = useMutation({ mutationFn: () => admin.unlock(id) });
  const resetPw = useMutation({ mutationFn: () => admin.resetPassword(id) });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-paper p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Fiche bénévole</h2>
          <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-line">Fermer</button>
        </div>

        {isLoading || !data ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <div className="card p-4">
              <p className="text-xl font-extrabold text-ink">{data.firstName} {data.lastName.toUpperCase()}</p>
              <p className="text-sm text-muted">{data.email} · {data.phone}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill on={data.validationStatus === 'VALIDATED'} yes="Profil validé" no="Profil en attente" />
                <Pill on={data.planningStatus === 'VALIDATED'} yes="Planning validé" no="Brouillon" />
                {data.isMinor && <span className="rounded-full bg-warnbg px-2.5 py-1 text-xs font-bold text-warn">Mineur</span>}
                {!data.hasPhoto && <span className="rounded-full bg-line px-2.5 py-1 text-xs font-bold text-full">Sans photo</span>}
              </div>
            </div>

            {msg && <Banner tone="info">{msg}</Banner>}
            {resetPw.data && (
              <Banner tone="warn">
                Mot de passe provisoire : <b className="font-mono">{resetPw.data.tempPassword}</b> — communique-le au bénévole.
              </Banner>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              {data.validationStatus !== 'VALIDATED' && (
                <button className="btn-primary text-sm" onClick={() => act(() => validate.mutateAsync(), 'Profil validé.')}>Valider le profil</button>
              )}
              {data.planningStatus === 'VALIDATED' && (
                <button className="btn-ghost text-sm" onClick={() => act(() => unlock.mutateAsync(), 'Planning déverrouillé.')}>Déverrouiller le planning</button>
              )}
              <button className="btn-ghost text-sm" onClick={() => act(() => resetPw.mutateAsync(), '')}>Réinitialiser le mot de passe</button>
              <a className="btn-ghost text-sm" href={admin.badgeUrl(id)} target="_blank" rel="noopener">Badge PDF</a>
            </div>

            {/* Planning */}
            <div className="card p-4">
              <h3 className="mb-2 text-sm font-bold text-ink">Planning ({data.bookings.length})</h3>
              {data.bookings.length === 0 ? (
                <p className="text-sm text-muted">Aucun créneau.</p>
              ) : (
                <ul className="divide-y divide-line text-sm">
                  {data.bookings.map((b) => (
                    <li key={b.bookingId} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{b.mission}{!b.isPublic && <span className="ml-1 text-xs text-warn">sensible</span>}</span>
                        <span className="block text-xs text-muted">{b.day} · {b.startTime}–{b.endTime}</span>
                      </span>
                      <button
                        className="shrink-0 text-xs font-semibold text-brand hover:underline"
                        onClick={() => act(() => admin.removeBooking(b.bookingId), 'Créneau retiré.')}
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
