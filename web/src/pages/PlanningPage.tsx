import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, MissionSlot } from '../lib/api';
import { Spinner, Banner, ConfirmDialog } from '../components/ui';
import { missionIcon } from '../lib/missionIcons';

export function PlanningPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dayIdx, setDayIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['planning'], queryFn: api.planning });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['planning'] });
    qc.invalidateQueries({ queryKey: ['myPlanning'] });
  };
  const onError = (e: unknown) => setFlash(e instanceof ApiError ? e.message : 'Action impossible.');

  const bookM = useMutation({
    mutationFn: (id: string) => api.book(id),
    onSuccess: () => { setFlash(null); invalidate(); },
    onError,
  });
  const unbookM = useMutation({
    mutationFn: (id: string) => api.unbook(id),
    onSuccess: () => { setFlash(null); invalidate(); },
    onError,
  });
  const validateM = useMutation({
    mutationFn: () => api.validate(),
    onSuccess: () => { setConfirm(false); invalidate(); navigate('/recap'); },
    onError: (e) => { setConfirm(false); onError(e); },
  });

  if (isLoading || !data) return <Spinner label="Chargement du planning…" />;

  const locked = data.planningStatus === 'VALIDATED';
  const count = data.myBookingsCount;
  const { minSlots, maxSlots, windowOpen } = data.edition;
  const canValidate = !locked && count >= minSlots;
  const day = data.days[dayIdx];
  const slot = day.slots[slotIdx] ?? day.slots[0];

  // Créneaux retenus, tous jours confondus
  const mine: { mission: string; day: string; start: string; end: string }[] = [];
  data.days.forEach((d) =>
    d.slots.forEach((s) =>
      s.missions.forEach((m) => {
        if (m.bookedByMe) mine.push({ mission: m.missionName, day: d.label, start: s.startTime, end: s.endTime });
      }),
    ),
  );
  const myCountForDay = (di: number) =>
    data.days[di].slots.reduce((n, s) => n + s.missions.filter((m) => m.bookedByMe).length, 0);

  const busy = bookM.isPending || unbookM.isPending;

  return (
    <div className="space-y-5">
      {/* En-tête objectif */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              locked ? 'bg-okbg text-ok' : 'bg-brand-50 text-brand'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${locked ? 'bg-ok' : 'bg-brand'}`} />
            {locked ? 'Planning validé' : 'Brouillon en cours'}
          </span>
          <span className="font-display text-sm font-bold text-ink">
            Objectif : {count} / {maxSlots}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Minimum {minSlots} créneau{minSlots > 1 ? 'x' : ''} requis · Max {maxSlots} créneaux
        </p>
        {!locked && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirm(true)}
              disabled={!canValidate}
              className="btn-primary btn-block"
            >
              ✓ Valider mon planning
            </button>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ['planning'] })}
              aria-label="Rafraîchir"
              className="btn-ghost px-3"
            >
              ↻
            </button>
          </div>
        )}
      </div>

      {flash && <Banner tone="error">{flash}</Banner>}
      {locked && (
        <Banner tone="success">
          Ton planning est validé et verrouillé. Contacte l'orga pour toute modification.
        </Banner>
      )}
      {!windowOpen && !locked && (
        <Banner tone="warn">Les inscriptions sont fermées (consultation seule).</Banner>
      )}

      {/* 1. Jour */}
      <section>
        <SectionTitle n="1" title="Choisissez la journée" hint="3 jours de festival" />
        <div className="grid grid-cols-3 gap-2 md:flex">
          {data.days.map((d, i) => {
            const [weekday, ...rest] = d.label.split(' ');
            const c = myCountForDay(i);
            return (
              <button
                key={d.id}
                onClick={() => { setDayIdx(i); setSlotIdx(0); }}
                className={`rounded-xl border px-2 py-2.5 text-center transition md:px-8 ${
                  i === dayIdx ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
                }`}
              >
                <span className="block font-display text-sm font-bold">{weekday}</span>
                <span className={`block text-xs ${i === dayIdx ? 'text-white/80' : 'text-muted'}`}>
                  {rest.slice(0, 2).join(' ')}
                </span>
                <span className={`mt-0.5 block text-[11px] ${i === dayIdx ? 'text-white/70' : 'text-brand'}`}>
                  {c > 0 ? `${c} créneau${c > 1 ? 'x' : ''}` : '—'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Tranche horaire */}
      <section>
        <SectionTitle n="2" title="Sélectionnez un créneau" hint={`${day.slots.length} tranches horaires`} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {day.slots.map((s, i) => {
            const free = s.missions.some((m) => m.reservable || m.bookedByMe);
            return (
              <button
                key={s.timeSlotId}
                onClick={() => setSlotIdx(i)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  i === slotIdx ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${free ? 'bg-ok' : 'bg-full'}`} />
                {s.startTime}–{s.endTime}
              </button>
            );
          })}
        </div>
      </section>

      {/* Missions du créneau sélectionné */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {slot.missions.map((m) => (
          <MissionCard
            key={m.missionSlotId}
            m={m}
            locked={locked}
            busy={busy}
            onBook={() => bookM.mutate(m.missionSlotId)}
            onUnbook={() => m.bookingId && unbookM.mutate(m.bookingId)}
          />
        ))}
      </div>

      {/* Récap */}
      <div className="card p-4">
        <h2 className="flex items-center gap-2 font-display font-bold text-ink">
          🗓️ Vos créneaux retenus ({count}/{maxSlots})
        </h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Aucun créneau pour l'instant.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {mine.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="font-semibold text-ink">Créneau {i + 1} : {b.mission}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">
                  {b.day.split(' ').slice(0, 2).join(' ')} · {b.start}–{b.end}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!locked && count < minSlots && (
          <p className="mt-3 text-xs text-warn">
            Il te manque {minSlots - count} créneau{minSlots - count > 1 ? 'x' : ''} pour valider.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Valider définitivement ?"
        body={
          <>
            Tu vas verrouiller <b>{count} créneau{count > 1 ? 'x' : ''}</b>. Après validation, tu ne
            pourras plus modifier ton planning toi-même.
          </>
        }
        confirmLabel="Oui, valider"
        busy={validateM.isPending}
        onConfirm={() => validateM.mutate()}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function SectionTitle({ n, title, hint }: { n: string; title: string; hint: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="font-display text-sm font-bold text-ink">
        <span className="text-brand">{n}.</span> {title}
      </h2>
      <span className="text-xs text-muted">{hint}</span>
    </div>
  );
}

const BADGE: Record<MissionSlot['state'], { label: string; cls: string; bar: string }> = {
  MINE: { label: 'Sélectionné', cls: 'bg-okbg text-ok', bar: 'bg-brand' },
  GREEN: { label: 'Disponible', cls: 'bg-okbg text-ok', bar: 'bg-ok' },
  ORANGE: { label: 'Presque complet', cls: 'bg-warnbg text-warn', bar: 'bg-warn' },
  FULL: { label: 'Complet', cls: 'bg-line text-full', bar: 'bg-full' },
  UNAVAILABLE: { label: 'Indisponible', cls: 'bg-line text-full', bar: 'bg-full' },
};

function MissionCard({
  m,
  locked,
  busy,
  onBook,
  onUnbook,
}: {
  m: MissionSlot;
  locked: boolean;
  busy: boolean;
  onBook: () => void;
  onUnbook: () => void;
}) {
  const meta = BADGE[m.state];
  const fill = m.capacity > 0 ? ((m.capacity - m.remaining) / m.capacity) * 100 : 100;
  const canAct = !locked && !busy && (m.bookedByMe || m.reservable);

  return (
    <div
      className={`rounded-2xl border bg-white p-4 ${
        m.bookedByMe ? 'border-brand border-l-4 bg-brand-50' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
          {missionIcon(m.missionName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display font-bold leading-tight text-ink">{m.missionName}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.cls}`}>
              {meta.label}
            </span>
          </div>
          {m.location && <p className="mt-0.5 text-xs text-muted">📍 {m.location}</p>}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">
            Capacité : <b className="text-ink">{m.capacity - m.remaining}/{m.capacity}</b>
          </span>
          <span className={`font-semibold ${m.state === 'ORANGE' ? 'text-warn' : m.state === 'FULL' ? 'text-full' : 'text-ok'}`}>
            {m.state === 'FULL' ? 'Complet' : `${m.remaining} place${m.remaining > 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
          <div className={`h-full ${meta.bar}`} style={{ width: `${fill}%` }} />
        </div>
      </div>

      <div className="mt-3">
        {m.bookedByMe ? (
          <>
            <p className="mb-2 text-xs font-semibold text-brand">✓ Votre place est réservée</p>
            <button onClick={onUnbook} disabled={!canAct} className="btn-ghost btn-block py-2 text-sm">
              ✕ Retirer
            </button>
          </>
        ) : m.reservable && !locked ? (
          <button onClick={onBook} disabled={busy} className="btn-primary btn-block py-2 text-sm">
            + Choisir
          </button>
        ) : (
          <button disabled className="btn-ghost btn-block py-2 text-sm">
            {m.state === 'FULL' ? 'Complet' : locked ? 'Verrouillé' : 'Indisponible'}
          </button>
        )}
        {m.state === 'UNAVAILABLE' && m.reason && !m.bookedByMe && (
          <p className="mt-2 text-xs text-full">{m.reason}</p>
        )}
      </div>
    </div>
  );
}
