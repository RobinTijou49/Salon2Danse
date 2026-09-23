import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lien invalide ou expiré.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex justify-center">
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-card">
          <Logo className="h-12 w-auto" />
        </div>
      </div>
      <div className="card p-6">
        <h1 className="text-xl font-bold text-ink">Nouveau mot de passe</h1>
        {done ? (
          <div className="mt-4">
            <Banner tone="success">Mot de passe modifié. Redirection vers la connexion…</Banner>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {error && <Banner tone="error">{error}</Banner>}
            <input
              className="field"
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted">8 caractères minimum.</p>
            <button className="btn-primary btn-block" disabled={busy}>
              {busy ? 'Validation…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/login" className="font-semibold text-brand">Retour à la connexion</Link>
      </p>
    </div>
  );
}
