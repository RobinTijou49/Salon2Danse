import { useQuery } from '@tanstack/react-query';

type Health = { status: string; db: string; time: string };

async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('API injoignable');
  return res.json();
}

export default function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 10000,
  });

  const dbUp = data?.db === 'up';

  return (
    <div className="min-h-full bg-neutral-50 text-neutral-900 flex flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-salon">
          Angers · 14–16 mai 2027
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Plateforme bénévoles
        </h1>
        <p className="mt-3 text-neutral-600">
          Squelette déployé. Le socle technique tourne — les modules métier
          (auth, planning, back-office) se branchent à partir d'ici.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            className={
              'inline-block h-2.5 w-2.5 rounded-full ' +
              (isLoading ? 'bg-neutral-300' : dbUp ? 'bg-emerald-500' : 'bg-red-500')
            }
          />
          <span className="text-sm font-medium">
            {isLoading
              ? 'Vérification de l\'API…'
              : isError
              ? 'API injoignable'
              : dbUp
              ? 'API + base de données opérationnelles'
              : 'API en ligne, base de données indisponible'}
          </span>
        </div>
        {data && (
          <p className="mt-2 text-xs font-mono text-neutral-400">
            {new Date(data.time).toLocaleTimeString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}
