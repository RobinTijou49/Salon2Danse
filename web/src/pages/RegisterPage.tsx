import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

export function RegisterPage() {
  const [step, setStep] = useState<'code' | 'form'>('code');
  const [code, setCode] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
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
      if (!valid) {
        setError("Ce code d'invitation est invalide ou déjà utilisé.");
        return;
      }
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
      const user = await api.register({ code: code.trim(), ...form });
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

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-card">
          <Logo className="h-12 w-auto" />
        </div>
        <p className="eyebrow">Espace bénévoles · Angers</p>
      </div>

      <div className="card p-6">
        {step === 'code' ? (
          <>
            <span className="eyebrow">Étape 1 / 2</span>
            <h1 className="mt-1 text-xl font-bold text-ink">Ton code d'invitation</h1>
            <p className="mt-1 text-sm text-muted">
              Saisis le code reçu par e-mail de l'équipe du Salon.
            </p>
            <form onSubmit={checkCode} className="mt-5 space-y-4">
              {error && <Banner tone="error">{error}</Banner>}
              <input
                className="field text-center text-lg font-display font-bold uppercase tracking-[.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX"
                autoFocus
                required
              />
              <button type="submit" className="btn-primary btn-block" disabled={busy}>
                {busy ? 'Vérification…' : 'Continuer'}
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="eyebrow">Étape 2 / 2</span>
            <h1 className="mt-1 text-xl font-bold text-ink">Crée ton compte</h1>
            <p className="mt-1 text-sm text-muted">
              Ces informations serviront à ton badge. Elles ne seront modifiables que par
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
                <label className="label">Téléphone</label>
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
                <p className="mt-1 text-xs text-muted">8 caractères minimum.</p>
              </div>
              <Banner tone="info">
                📸 Juste après, on te demandera ta photo (obligatoire pour le badge).
              </Banner>
              <button type="submit" className="btn-primary btn-block" disabled={busy}>
                {busy ? 'Création…' : 'Créer mon compte'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{' '}
        <Link to="/login" className="font-semibold text-brand">
          Connecte-toi
        </Link>
      </p>
    </div>
  );
}
