import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { admin } from '../lib/api';
import { Spinner, Banner } from '../components/ui';

function downloadCodes(editionName: string, codes: string[]) {
  const csv = '﻿Code\r\n' + codes.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `codes-${editionName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminEditions() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'editions'], queryFn: admin.editions });
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'editions'] });

  const create = useMutation({
    mutationFn: () => admin.createEdition(name, startDate),
    onSuccess: (r) => { setCodes(r.codes); setName(''); setStartDate(''); refresh(); },
  });
  const archive = useMutation({
    mutationFn: (p: { id: string; archived: boolean }) => admin.archiveEdition(p.id, p.archived),
    onSuccess: refresh,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name && startDate) create.mutate();
  }

  if (isLoading || !data) return <Spinner label="Chargement…" />;

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Multi-éditions</span>
        <h1 className="text-2xl font-extrabold text-ink">Éditions</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.map((e) => (
          <div key={e.id} className={`card p-5 ${e.isArchived ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display font-bold text-ink">{e.name}</h2>
              {e.isArchived && (
                <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-bold text-full">Archivée</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {new Date(e.startDate).toLocaleDateString('fr-FR')} →{' '}
              {new Date(e.endDate).toLocaleDateString('fr-FR')}
            </p>
            <p className="mt-2 text-sm text-ink">{e.volunteers} bénévole(s)</p>
            <button
              className="btn-ghost mt-4 w-full text-sm"
              onClick={() => archive.mutate({ id: e.id, archived: !e.isArchived })}
            >
              {e.isArchived ? 'Réactiver' : 'Archiver (lecture seule)'}
            </button>

            <CodesPanel editionId={e.id} editionName={e.name} />
          </div>
        ))}
      </div>

      {/* Création */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-ink">Créer une édition</h2>
        <p className="mt-1 text-sm text-muted">
          Génère automatiquement 3 jours × 5 créneaux × 11 missions + 10 codes d'invitation.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            className="field"
            placeholder="Nom (ex. Salon de la Danse — Angers 2028)"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            required
          />
          <input
            className="field"
            type="date"
            value={startDate}
            onChange={(ev) => setStartDate(ev.target.value)}
            required
          />
          <button className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Création…' : 'Créer'}
          </button>
        </form>

        {codes && (
          <div className="mt-4">
            <Banner tone="warn">
              Édition créée. Codes d'invitation (note-les, ils sont hachés en base) :
              <span className="mt-2 block font-mono text-xs">{codes.join('  ·  ')}</span>
            </Banner>
          </div>
        )}
      </div>
    </div>
  );
}

function CodesPanel({ editionId, editionName }: { editionId: string; editionName: string }) {
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ['admin', 'codeStats', editionId],
    queryFn: () => admin.codeStats(editionId),
  });
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState<string[] | null>(null);

  const gen = useMutation({
    mutationFn: () => admin.generateCodes(editionId, count),
    onSuccess: (r) => {
      setCodes(r.codes);
      qc.invalidateQueries({ queryKey: ['admin', 'codeStats', editionId] });
      qc.invalidateQueries({ queryKey: ['admin', 'editions'] });
    },
  });

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Codes d'invitation</span>
        {stats.data && (
          <span className="tabular-nums">
            <b className="text-ok">{stats.data.available}</b> libres ·{' '}
            {stats.data.consumed} utilisés
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={500}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="field w-20 py-1.5 text-sm"
        />
        <button
          className="btn-primary flex-1 py-1.5 text-sm"
          disabled={gen.isPending}
          onClick={() => gen.mutate()}
        >
          {gen.isPending ? '…' : 'Générer'}
        </button>
      </div>

      {codes && (
        <div className="mt-3 rounded-lg bg-warnbg p-2.5">
          <p className="text-[11px] font-semibold text-warn">
            {codes.length} codes — visibles une seule fois, exporte-les maintenant.
          </p>
          <p className="mt-1 max-h-24 overflow-y-auto break-all font-mono text-[11px] text-ink">
            {codes.join('  ·  ')}
          </p>
          <button
            className="btn-ghost mt-2 w-full py-1.5 text-xs"
            onClick={() => downloadCodes(editionName, codes)}
          >
            ⬇ Télécharger en CSV
          </button>
        </div>
      )}
    </div>
  );
}
