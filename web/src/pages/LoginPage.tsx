import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.login(email, password);
      await qc.invalidateQueries({ queryKey: ['me'] });
      refresh();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="rounded-2xl bg-brand px-6 py-5 shadow-card">
          <Logo className="h-16 w-auto" />
        </div>
        <p className="eyebrow">Espace bénévoles · Angers</p>
      </div>

      <div className="card p-6">
        <h1 className="text-xl font-bold text-ink">Connexion bénévole</h1>
        <p className="mt-1 text-sm text-muted">Content de te revoir. Accède à ton planning.</p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {error && <Banner tone="error">{error}</Banner>}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary btn-block" disabled={busy}>
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <p className="text-center">
            <Link to="/forgot-password" className="text-sm font-semibold text-brand">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Tu as un code d'invitation ?{' '}
        <Link to="/register" className="font-semibold text-brand">
          Crée ton compte
        </Link>
      </p>
    </div>
  );
}
