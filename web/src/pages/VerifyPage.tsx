import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Logo } from '../components/Logo';
import { Spinner } from '../components/ui';

// Page PUBLIQUE de vérification : ce que voit une personne qui scanne le QR
// d'un badge à l'entrée. Le jeton est signé côté serveur (non falsifiable).
export function VerifyPage() {
  const { token = '' } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['verify', token],
    queryFn: () => api.verifyBadge(token),
  });

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-5 py-8">
      <div className="mb-6 flex justify-center">
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-card">
          <Logo className="h-11 w-auto" />
        </div>
      </div>

      {isLoading || !data ? (
        <Spinner label="Vérification…" />
      ) : !data.valid ? (
        <div className="card border-red-200 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
            ⛔
          </div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Badge non valide</h1>
          <p className="mt-1 text-sm text-muted">
            Ce QR code n'est pas reconnu ou a été falsifié.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-col items-center bg-okbg px-6 py-6 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ok text-lg text-white">
              ✓
            </div>
            <p className="mt-2 font-display text-sm font-bold uppercase tracking-wide text-ok">
              Badge authentique
            </p>
          </div>

          <div className="flex flex-col items-center px-6 py-6 text-center">
            <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-brand-50 bg-paper">
              {data.hasPhoto ? (
                <img
                  src={api.verifyPhotoUrl(token)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">🙂</div>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-ink">
              {data.firstName} {data.lastName.toUpperCase()}
            </h1>
            <span className="mt-2 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
              {data.role}
            </span>
            {!data.planningValidated && (
              <p className="mt-2 text-xs text-warn">Planning non encore validé</p>
            )}
          </div>

          {data.missions.length > 0 && (
            <div className="border-t border-line px-6 py-4">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                Missions
              </h2>
              <ul className="space-y-2">
                {data.missions.map((m, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 font-display font-semibold text-brand tabular-nums">
                      {m.startTime}–{m.endTime}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{m.mission}</span>
                      <span className="block text-xs text-muted">{m.day}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
