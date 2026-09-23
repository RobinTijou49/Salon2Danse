import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { admin, ApiError, SlotRow } from '../lib/api';
import { Spinner, Banner } from '../components/ui';
import { useEdition } from './editionContext';

export function AdminSlots() {
  const { editionId } = useEdition();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const slots = useQuery({
    queryKey: ['admin', 'slots', editionId],
    queryFn: () => admin.listSlots(editionId),
  });
  const meta = useQuery({
    queryKey: ['admin', 'slotsMeta', editionId],
    queryFn: () => admin.slotsMeta(editionId),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'slots', editionId] });
  const fail = (e: unknown) => setMsg(e instanceof ApiError ? e.message : 'Action impossible.');

  const del = useMutation({
    mutationFn: (id: string) => admin.deleteSlot(id),
    onSuccess: () => { setMsg(null); refresh(); },
    onError: fail,
  });

  // Création
  const [missionId, setMissionId] = useState('');
  const [timeSlotId, setTimeSlotId] = useState('');
  const [capacity, setCapacity] = useState(4);
  const create = useMutation({
    mutationFn: () => admin.createSlot(missionId, timeSlotId, capacity),
    onSuccess: () => { setMsg('Créneau créé.'); refresh(); },
    onError: fail,
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (missionId && timeSlotId) create.mutate();
  }

  if (slots.isLoading || !slots.data) return <Spinner label="Chargement…" />;

  // Regroupe par jour
  const byDay = new Map<string, SlotRow[]>();
  for (const s of slots.data) {
    const arr = byDay.get(s.dayLabel) ?? [];
    arr.push(s);
    byDay.set(s.dayLabel, arr);
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Paramétrage</span>
        <h1 className="text-2xl font-extrabold text-ink">Créneaux réservables</h1>
        <p className="text-sm text-muted">Ajuste les jauges, ajoute ou retire des créneaux.</p>
      </div>

      {msg && <Banner tone="info">{msg}</Banner>}

      {/* Création */}
      <form onSubmit={submit} className="card grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto_auto]">
        <select className="select" value={missionId} onChange={(e) => setMissionId(e.target.value)} required>
          <option value="">Mission…</option>
          {meta.data?.missions.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.isPublic ? '' : ' (sensible)'}</option>
          ))}
        </select>
        <select className="select" value={timeSlotId} onChange={(e) => setTimeSlotId(e.target.value)} required>
          <option value="">Créneau horaire…</option>
          {meta.data?.timeSlots.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="field w-24"
          title="Capacité"
        />
        <button className="btn-primary" disabled={create.isPending}>
          {create.isPending ? '…' : 'Ajouter'}
        </button>
      </form>

      {/* Liste par jour */}
      {[...byDay.entries()].map(([day, rows]) => (
        <div key={day} className="card overflow-hidden">
          <div className="border-b border-line bg-brand-50 px-4 py-2.5">
            <h2 className="font-display font-bold text-brand">{day}</h2>
          </div>
          <ul className="divide-y divide-line">
            {rows.map((s) => (
              <SlotRowItem
                key={s.id}
                s={s}
                onSaved={() => setMsg('Capacité mise à jour.')}
                onDelete={() => del.mutate(s.id)}
                deleting={del.isPending}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SlotRowItem({
  s,
  onSaved,
  onDelete,
  deleting,
}: {
  s: SlotRow;
  onSaved: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const qc = useQueryClient();
  const [cap, setCap] = useState(s.capacity);
  const save = useMutation({
    mutationFn: (v: number) => admin.updateSlotCapacity(s.id, v),
    onSuccess: () => {
      onSaved();
      qc.invalidateQueries({ queryKey: ['admin', 'slots'] });
    },
  });
  const dirty = cap !== s.capacity;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
      <div className="w-28 shrink-0 font-display font-semibold text-ink tabular-nums">
        {s.startTime}–{s.endTime}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-ink">{s.missionName}</span>
        {!s.isPublic && <span className="ml-1 text-xs text-warn">sensible</span>}
      </div>
      <span className="shrink-0 text-xs text-muted tabular-nums">{s.booked} réservé(s)</span>
      <input
        type="number"
        min={0}
        value={cap}
        onChange={(e) => setCap(Number(e.target.value))}
        className="field w-20 py-1.5"
        title="Capacité"
      />
      <button
        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate(cap)}
      >
        Enregistrer
      </button>
      <button
        className="shrink-0 text-xs font-semibold text-brand hover:underline disabled:opacity-40"
        onClick={onDelete}
        disabled={deleting || s.booked > 0}
        title={s.booked > 0 ? 'Des réservations existent' : 'Supprimer'}
      >
        Supprimer
      </button>
    </li>
  );
}
