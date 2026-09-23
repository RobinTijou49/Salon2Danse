import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-zA-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  return s;
}

export function RegisterPage() {
  const [step, setStep] = useState<'code' | 'form'>('code');
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '' });
  const [isMinor, setIsMinor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function checkCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { valid } = await api.verifyInvite(code.trim());
      if (!valid) return setError("Ce code d'invitation est invalide ou déjà utilisé.");
      setStep('form');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await api.register({ code: code.trim(), ...form, isMinor });
      setUser(user);
      await qc.invalidateQueries({ queryKey: ['me'] });
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const sc = strength(form.password);
  const scLabel = ['Trop court', 'Faible', 'Correct', 'Robuste', 'Sécurisé'][sc];

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-card">
          <Logo className="h-12 w-auto" />
        </div>
        <p className="eyebrow">Espace bénévoles · Angers</p>
      </div>

      <div className="card p-6">
        <StepBar step={step} />
        {step === 'code' ? (
          <>
            <h1 className="mt-4 text-xl font-bold text-ink">Ton code d'invitation</h1>
            <p className="mt-1 text-sm text-muted">
              Saisis le code unique reçu par e-mail de l'équipe du Salon de la Danse.
            </p>
            <form onSubmit={checkCode} className="mt-5 space-y-4">
              {error && <Banner tone="error">{error}</Banner>}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0">Code d'accès</label>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    🔒 Confidentiel
                  </span>
                </div>
                <input
                  className="field text-center text-lg font-display font-bold uppercase tracking-[.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn-primary btn-block" disabled={busy}>
                {busy ? 'Vérification…' : 'Continuer →'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-muted">
              Tu n'as pas reçu ton code ?{' '}
              <a href="mailto:benevoles@salondeladanse.fr" className="font-semibold text-brand">
                Contacte l'équipe
              </a>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-bold text-ink">Crée ton compte</h1>
            <p className="mt-1 text-sm text-muted">
              Ces informations serviront à ton badge d'accès. Elles ne seront modifiables que par
              l'organisation.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              {error && <Banner tone="error">{error}</Banner>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Prénom</label>
                  <input className="field" value={form.firstName} onChange={set('firstName')} required />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input className="field" value={form.lastName} onChange={set('lastName')} required />
                </div>
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="field" type="email" value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="label">Téléphone mobile</label>
                <input className="field" type="tel" value={form.phone} onChange={set('phone')} required />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  className="field"
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  required
                />
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < sc ? (sc >= 3 ? 'bg-ok' : 'bg-warn') : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>
                  {form.password && (
                    <span className={`text-xs font-semibold ${sc >= 3 ? 'text-ok' : 'text-warn'}`}>
                      {scLabel}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted">8 caractères minimum.</p>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3 text-sm">
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => setIsMinor(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-brand"
                />
                <span className="text-ink">
                  Je suis <b>mineur</b> (moins de 18 ans).
                  <span className="block text-xs text-muted">
                    Ton inscription devra être validée par l'organisation (autorisation parentale requise).
                  </span>
                </span>
              </label>

              <Banner tone="info">
                📸 <b>Juste après</b>, on te demandera ta photo (obligatoire pour l'impression de ton badge).
              </Banner>

              <button type="submit" className="btn-primary btn-block" disabled={busy}>
                {busy ? 'Création…' : 'Créer mon compte et continuer →'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{' '}
        <Link to="/login" className="font-semibold text-brand">Connecte-toi</Link>
      </p>
    </div>
  );
}

function StepBar({ step }: { step: 'code' | 'form' }) {
  const full = step === 'form';
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className="text-brand">Étape {full ? '2' : '1'} / 2</span>
        <span>{full ? 'Dernière étape ✓' : 'Vérification'}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-brand transition-all" style={{ width: full ? '100%' : '50%' }} />
      </div>
    </div>
  );
}
