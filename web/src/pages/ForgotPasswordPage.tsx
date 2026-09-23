import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch {
      setSent(true); // réponse identique (anti-énumération)
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
        <h1 className="text-xl font-bold text-ink">Mot de passe oublié</h1>
        {sent ? (
          <div className="mt-4">
            <Banner tone="success">
              Si un compte existe pour cette adresse, un e-mail avec un lien de réinitialisation
              vient d'être envoyé (valable 1 h).
            </Banner>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <p className="text-sm text-muted">
              Saisis ton e-mail : on t'envoie un lien pour choisir un nouveau mot de passe.
            </p>
            <input
              className="field"
              type="email"
              placeholder="ton@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn-primary btn-block" disabled={busy}>
              {busy ? 'Envoi…' : 'Envoyer le lien'}
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
