import { useQuery } from '@tanstack/react-query';
import { admin } from '../lib/api';
import { Spinner } from '../components/ui';

const ACTION_LABEL: Record<string, string> = {
  VALIDATE_PROFILE: 'Validation profil',
  UNLOCK_PLANNING: 'Déverrouillage planning',
  RESET_PASSWORD: 'Réinitialisation mot de passe',
  UPDATE_IDENTITY: 'Modification identité',
  FORCE_ASSIGN: 'Attribution forcée',
  REMOVE_BOOKING: 'Retrait de créneau',
};

export function AdminAudit() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'audit'], queryFn: admin.audit });
  if (isLoading || !data) return <Spinner label="Chargement…" />;

  return (
    <div className="space-y-4">
      <div>
        <span className="eyebrow">Traçabilité</span>
        <h1 className="text-2xl font-extrabold text-ink">Journal d'audit</h1>
        <p className="text-sm text-muted">Les 100 dernières actions administrateur.</p>
      </div>

      {data.length === 0 ? (
        <div className="card p-6 text-center text-muted">Aucune action enregistrée pour l'instant.</div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {data.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{ACTION_LABEL[l.action] ?? l.action}</span>
                  <span className="block text-xs text-muted">
                    par {l.actor} · {l.entityType}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {new Date(l.createdAt).toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
