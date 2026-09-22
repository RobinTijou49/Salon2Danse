import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, Availability, MissionSlot } from '../lib/api';
import { Spinner, Banner, ConfirmDialog } from '../components/ui';

export function PlanningPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dayIdx, setDayIdx] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['planning'], queryFn: api.planning });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['planning'] });
    qc.invalidateQueries({ queryKey: ['myPlanning'] });
  };
  const onError = (e: unknown) =>
    setFlash(e instanceof ApiError ? e.message : 'Action impossible.');

  const bookM = useMutation({
    mutationFn: (missionSlotId: string) => api.book(missionSlotId),
    onSuccess: () => { setFlash(null); invalidate(); },
    onError,
  });
  const unbookM = useMutation({
    mutationFn: (bookingId: string) => api.unbook(bookingId),
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

  return (
    <div className="-mt-1">
      {/* Bandeau d'avancement collant */}
      <div className="sticky top-[68px] z-20 -mx-4 mb-4 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Mes créneaux</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-extrabold text-brand">{count}</span>
              <span className="text-sm text-muted">/ {maxSlots}</span>
              <Dots count={count} max={maxSlots} />
            </div>
          </div>
          {locked ? (
            <span className="rounded-full bg-okbg px-3 py-1.5 text-xs font-bold text-ok">
              Validé ✓
            </span>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              disabled={!canValidate}
              className="btn-primary px-4 py-2.5 text-sm"
            >
              Valider
            </button>
          )}
        </div>
        {!locked && count < minSlots && (
          <p className="mt-2 text-xs text-muted">
            Choisis au moins {minSlots} créneau{minSlots > 1 ? 'x' : ''} pour pouvoir valider.
          </p>
        )}
      </div>

      {flash && (
        <div className="mb-4">
          <Banner tone="error">{flash}</Banner>
        </div>
      )}
      {locked && (
        <div className="mb-4">
          <Banner tone="success">
            Ton planning est validé et verrouillé. Contacte l'orga pour toute modification.
          </Banner>
        </div>
      )}
      {!windowOpen && !locked && (
        <div className="mb-4">
          <Banner tone="warn">Les inscriptions sont actuellement fermées (consultation seule).</Banner>
        </div>
      )}

      {/* Onglets jour */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {data.days.map((d, i) => {
          const [weekday, ...rest] = d.label.split(' ');
          return (
            <button
              key={d.id}
              onClick={() => setDayIdx(i)}
              className={`rounded-xl border px-2 py-2.5 text-center transition ${
                i === dayIdx
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-white text-ink'
              }`}
            >
              <span className="block text-sm font-display font-bold">{weekday}</span>
              <span className={`block text-xs ${i === dayIdx ? 'text-white/80' : 'text-muted'}`}>
                {rest.slice(0, 2).join(' ')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Créneaux du jour */}
      <div className="space-y-6">
        {day.slots.map((slot) => (
          <section key={slot.timeSlotId}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <span className="font-display">{slot.startTime} – {slot.endTime}</span>
              <span className="h-px flex-1 bg-line" />
            </h2>
            <div className="space-y-2.5">
              {slot.missions.map((m) => (
                <MissionRow
                  key={m.missionSlotId}
                  m={m}
                  locked={locked}
                  busy={bookM.isPending || unbookM.isPending}
                  onBook={() => bookM.mutate(m.missionSlotId)}
                  onUnbook={() => m.bookingId && unbookM.mutate(m.bookingId)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ConfirmDialog
        open={confirm}
        title="Valider définitivement ?"
        body={
          <>
            Tu vas verrouiller <b>{count} créneau{count > 1 ? 'x' : ''}</b>. Après validation, tu
            ne pourras plus modifier ton planning toi-même.
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

function Dots({ count, max }: { count: number; max: number }) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < count ? 'bg-brand' : 'bg-line'}`}
        />
      ))}
    </span>
  );
}

const STATE_META: Record<
  MissionSlot['state'],
  { badge: string; badgeClass: string; bar: string }
> = {
  MINE: { badge: 'Réservé ✓', badgeClass: 'bg-brand text-white', bar: 'bg-brand' },
  GREEN: { badge: 'Disponible', badgeClass: 'bg-okbg text-ok', bar: 'bg-ok' },
  ORANGE: { badge: 'Presque complet', badgeClass: 'bg-warnbg text-warn', bar: 'bg-warn' },
  FULL: { badge: 'Complet', badgeClass: 'bg-line text-full', bar: 'bg-full' },
  UNAVAILABLE: { badge: 'Indisponible', badgeClass: 'bg-line text-full', bar: 'bg-full' },
};

function MissionRow({
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
  const meta = STATE_META[m.state];
  const clickable = !locked && !busy && (m.bookedByMe || m.reservable);
  const fill = m.capacity > 0 ? ((m.capacity - m.remaining) / m.capacity) * 100 : 100;

  const handle = () => {
    if (!clickable) return;
    m.bookedByMe ? onUnbook() : onBook();
  };

  return (
    <button
      onClick={handle}
      disabled={!clickable}
      className={`w-full rounded-xl border p-3.5 text-left transition ${
        m.bookedByMe
          ? 'border-brand bg-brand-50'
          : m.reservable && !locked
            ? 'border-line bg-white hover:border-brand active:scale-[.99]'
            : 'border-line bg-white opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-ink">{m.missionName}</p>
          {m.location && <p className="text-xs text-muted">{m.location}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}>
          {meta.badge}
        </span>
      </div>

      {/* Jauge */}
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className={`h-full ${meta.bar}`} style={{ width: `${fill}%` }} />
        </div>
        <span className="shrink-0 font-display text-xs font-semibold text-muted tabular-nums">
          {m.state === 'FULL' ? 'Complet' : `${m.remaining} place${m.remaining > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Message d'aide contextuel */}
      {m.bookedByMe && !locked && (
        <p className="mt-2 text-xs font-semibold text-brand">Appuie pour retirer ce créneau</p>
      )}
      {m.state === 'UNAVAILABLE' && m.reason && (
        <p className="mt-2 text-xs text-full">{m.reason}</p>
      )}
    </button>
  );
}
