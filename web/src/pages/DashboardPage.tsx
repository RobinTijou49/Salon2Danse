import { ChangeEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, Me } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Spinner, Banner } from '../components/ui';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['planning'], queryFn: api.planning });

  if (!user?.profile) {
    return (
      <Banner tone="info">
        Ce compte n'a pas de profil bénévole (compte administrateur).
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

      {/* Bandeau édition */}
      <div className="relative overflow-hidden rounded-2xl bg-brand p-5 text-white shadow-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(120% 120% at 100% 0%, rgba(242,116,170,.35) 0%, transparent 55%), radial-gradient(120% 120% at 0% 100%, rgba(0,0,0,.25) 0%, transparent 55%)',
          }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-extrabold">🎉 Édition 2027 · Angers</p>
            <p className="text-sm text-white/80">Vendredi 14 → dimanche 16 mai · Centre de Congrès</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
            3 jours de fête
          </span>
        </div>
      </div>

      {user.profile.isMinor && <ParentalConsentCard profile={user.profile} />}

      {/* Avancement */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted">Mes créneaux</p>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              validated ? 'bg-okbg text-ok' : 'bg-brand-50 text-brand'
            }`}
          >
            {validated ? 'Validé ✓' : 'Brouillon'}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-brand">{myBookingsCount}</span>
          <span className="text-lg font-semibold text-muted">/ {edition.maxSlots} max</span>
        </div>

        <SegmentedProgress count={myBookingsCount} min={edition.minSlots} max={edition.maxSlots} />

        <p className="mt-3 text-sm text-muted">
          {validated
            ? 'Ton planning est validé et verrouillé. Consulte ton récap.'
            : missing > 0
              ? `Il te manque ${missing} créneau${missing > 1 ? 'x' : ''} pour pouvoir valider.`
              : 'Tu peux valider ton planning quand tu veux.'}
        </p>
        <Link to="/planning" className="btn-primary btn-block mt-4">
          {validated ? 'Voir mon planning' : 'Composer mon planning →'}
        </Link>
      </div>

      {/* Règles */}
      <div>
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-ink">
          <span>📋</span> Les règles en bref
        </h2>
        <p className="mb-3 text-sm text-muted">À retenir pour construire ta participation.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <RuleCard icon="📅" title="3 jours de festival" text="Vendredi 14, samedi 15 et dimanche 16 mai 2027" />
          <RuleCard icon="⏱️" title="Créneaux de 2 heures" text={`Entre ${edition.minSlots} et ${edition.maxSlots} au total sur le week-end`} />
          <RuleCard icon="🚫" title="Rythme & repos respecté" text="Pas 2 missions au même moment, ni 3 d'affilée" />
          <RuleCard icon="🔒" title="Validation définitive" text="Une fois validé, ton planning est verrouillé" />
        </div>
      </div>

      {/* Contact */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <span>💬</span> Une question ou un imprévu ?
        </h2>
        <p className="mt-1 text-sm text-muted">
          L'équipe de coordination des bénévoles est là pour t'accompagner.
        </p>
        <div className="mt-3 space-y-2">
          <ContactRow icon="✉️" label="Écris-nous" value="benevoles@salondeladanse.fr" />
          <ContactRow icon="📞" label="Numéro d'urgence festival" value="07 83 28 87 28" />
        </div>
      </div>

      <p className="pt-1 text-center text-sm text-muted">
        Merci pour ton engagement <span className="text-brand">❤</span>
      </p>
    </div>
  );
}

function SegmentedProgress({ count, min, max }: { count: number; min: number; max: number }) {
  const labels = ['1er (requis)', '2e (option)', '3e (max)'];
  return (
    <div className="mt-4">
      <div className="flex gap-1.5">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < count ? 'bg-brand' : i < min ? 'bg-brand-50' : 'bg-line'
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        {labels.slice(0, max).map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function RuleCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-white p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{text}</p>
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-3.5 py-2.5">
      <span className="text-lg">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-semibold text-brand">{value}</p>
      </div>
    </div>
  );
}

function ParentalConsentCard({ profile }: { profile: NonNullable<Me['profile']> }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('Fichier trop lourd (10 Mo maximum).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.uploadParentalConsent(f);
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Envoi impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (profile.validationStatus === 'VALIDATED') {
    return <Banner tone="success">✅ Ton profil (mineur) a été validé par l'organisation.</Banner>;
  }
  if (profile.validationStatus === 'REJECTED') {
    return (
      <Banner tone="error">
        Ton profil n'a pas été validé. Contacte l'organisation : benevoles@salondeladanse.fr
      </Banner>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <span>📄</span> Autorisation parentale
        </h2>
        <span className="rounded-full bg-warnbg px-3 py-1 text-xs font-bold text-warn">
          {profile.hasParentalConsent ? 'En attente' : 'À fournir'}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        En tant que <b>mineur</b>, ton inscription doit être validée par l'organisation. Téléverse
        ton autorisation parentale signée (PDF ou photo).
      </p>

      {error && (
        <div className="mt-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {profile.hasParentalConsent && (
        <p className="mt-3 rounded-xl bg-okbg px-3 py-2 text-sm text-ok">
          ✓ Document envoyé — en attente de validation par l'organisation.
        </p>
      )}

      <label className="btn-ghost btn-block mt-4 cursor-pointer">
        {busy ? 'Envoi…' : profile.hasParentalConsent ? 'Remplacer le document' : 'Téléverser mon autorisation'}
        <input
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={pick}
          disabled={busy}
        />
      </label>
    </div>
  );
}
