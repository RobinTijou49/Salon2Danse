import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { admin, ApiError } from '../lib/api';
import { Spinner, Banner } from '../components/ui';

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

function CodesPanel({ editionId }: { editionId: string; editionName: string }) {
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ['admin', 'codeStats', editionId],
    queryFn: () => admin.codeStats(editionId),
  });
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [csvSummary, setCsvSummary] = useState<string | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'codeStats', editionId] });
    qc.invalidateQueries({ queryKey: ['admin', 'editions'] });
  };

  const invite = useMutation({
    mutationFn: () => admin.invite(editionId, email),
    onSuccess: (r) => {
      setMsg(
        r.status === 'used'
          ? `${r.email} a déjà utilisé un code (déjà inscrit).`
          : r.status === 'existing'
            ? `Un code existait déjà pour ${r.email} — e-mail renvoyé.`
            : `Code créé et envoyé à ${r.email}.`,
      );
      setEmail('');
      refresh();
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'Envoi impossible.'),
  });

  const csv = useMutation({
    mutationFn: (file: File) => admin.inviteCsv(editionId, file),
    onSuccess: (r) => {
      setCsvSummary(
        `${r.total} adresse(s) traitée(s) : ${r.created} code(s) envoyé(s), ${r.existing} déjà invité(s), ${r.used} déjà inscrit(s).`,
      );
      refresh();
    },
    onError: (e) => setCsvSummary(e instanceof ApiError ? e.message : 'Import impossible.'),
  });

  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Invitations</span>
        {stats.data && (
          <span className="tabular-nums">
            <b className="text-warn">{stats.data.available}</b> en attente ·{' '}
            {stats.data.consumed} inscrits
          </span>
        )}
      </div>

      {/* Inviter un bénévole par e-mail */}
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (email) invite.mutate();
        }}
      >
        <input
          type="email"
          className="field flex-1 py-1.5 text-sm"
          placeholder="email@benevole.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn-primary py-1.5 text-sm" disabled={invite.isPending}>
          {invite.isPending ? '…' : 'Inviter'}
        </button>
      </form>
      {msg && <p className="mt-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs text-brand">{msg}</p>}

      {/* Import CSV */}
      <label className="btn-ghost mt-2 flex w-full cursor-pointer items-center justify-center py-1.5 text-xs">
        {csv.isPending ? 'Import en cours…' : '⬆ Importer un CSV de bénévoles'}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={csv.isPending}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) csv.mutate(f);
            e.target.value = '';
          }}
        />
      </label>
      {csvSummary && (
        <p className="mt-2 rounded-lg bg-okbg px-2.5 py-1.5 text-xs text-ok">{csvSummary}</p>
      )}

      <a
        href={admin.codesExportUrl(editionId)}
        className="btn-ghost mt-2 flex w-full items-center justify-center py-1.5 text-xs"
      >
        ⬇ Exporter la liste (e-mails + codes)
      </a>
    </div>
  );
}
