import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner, Banner } from '../components/ui';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['planning'], queryFn: api.planning });

  if (!user?.profile) {
    return (
      <Banner tone="info">
        Ce compte n'a pas de profil bénévole (compte administrateur). L'espace admin arrive
        bientôt.
      </Banner>
    );
  }
  if (isLoading || !data) return <Spinner label="Chargement…" />;

  const { myBookingsCount, edition, planningStatus } = data;
  const validated = planningStatus === 'VALIDATED';
  const missing = Math.max(0, edition.minSlots - myBookingsCount);

  return (
    <div className="space-y-5">
      <div>
        <span className="eyebrow">Bienvenue</span>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">
          Salut {user.profile.firstName} 👋
        </h1>
        <p className="mt-1 text-muted">Compose ton planning pour le Salon de la Danse.</p>
      </div>

      {user.profile.isMinor && user.profile.validationStatus === 'PENDING' && (
        <Banner tone="warn">
          Ton profil (mineur) est en attente de validation par l'organisation.
        </Banner>
      )}

      {/* Carte d'avancement */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Mes créneaux</p>
            <p className="text-3xl font-extrabold text-brand">
              {myBookingsCount}
              <span className="text-lg font-semibold text-muted"> / {edition.maxSlots}</span>
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              validated ? 'bg-okbg text-ok' : 'bg-brand-50 text-brand'
            }`}
          >
            {validated ? 'Validé ✓' : 'Brouillon'}
          </span>
        </div>
        <p className="mt-3 text-sm text-muted">
          {validated
            ? 'Ton planning est validé et verrouillé. Consulte ton récap.'
            : missing > 0
              ? `Il te manque ${missing} créneau${missing > 1 ? 'x' : ''} pour pouvoir valider.`
              : 'Tu peux valider ton planning quand tu veux.'}
        </p>
        <Link to="/planning" className="btn-primary btn-block mt-4">
          {validated ? 'Voir mon planning' : 'Composer mon planning'}
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Règles d'engagement */}
        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Les règles en bref</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-ink">
            <Rule>📅 3 jours : vendredi 14, samedi 15, dimanche 16 mai 2027</Rule>
            <Rule>⏱️ Créneaux de 2 h · entre {edition.minSlots} et {edition.maxSlots} au total</Rule>
            <Rule>🚫 Pas 2 missions sur le même créneau, ni 3 créneaux d'affilée</Rule>
            <Rule>✅ Une fois validé, ton planning est verrouillé (l'orga peut le rouvrir)</Rule>
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Une question ?</h2>
          <p className="mt-1 text-sm text-muted">
            Contacte l'équipe bénévoles :{' '}
            <span className="text-brand font-semibold">benevoles@salondeladanse.fr</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return <li className="flex gap-2.5">{children}</li>;
}
