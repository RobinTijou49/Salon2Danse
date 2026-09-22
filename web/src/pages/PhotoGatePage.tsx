import { ChangeEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Logo } from '../components/Logo';
import { Banner } from '../components/ui';

// Verrou obligatoire : tant qu'il n'y a pas de photo, pas d'accès à l'app.
export function PhotoGatePage() {
  const { user, setUser, refresh } = useAuth();
  const qc = useQueryClient();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Choisis une image (JPEG ou PNG).');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Photo trop lourde (5 Mo maximum).');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadPhoto(file);
      // Recharge le profil : hasPhoto passe à true, le verrou se lève.
      await qc.invalidateQueries({ queryKey: ['me'] });
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    setUser(null);
    qc.clear();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-brand px-5 py-4 shadow-card">
          <Logo className="h-12 w-auto" />
        </div>
      </div>

      <div className="card p-6 text-center">
        <span className="eyebrow">Dernière étape</span>
        <h1 className="mt-1 text-xl font-bold text-ink">Ta photo de badge</h1>
        <p className="mt-1 text-sm text-muted">
          Une photo récente est <b>obligatoire</b> : elle figurera sur ton badge bénévole. Bien
          cadrée sur le visage, comme une photo d'identité.
        </p>

        {/* Aperçu */}
        <div className="mx-auto mt-5 flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-4 border-brand-50 bg-paper">
          {preview ? (
            <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl">📷</span>
          )}
        </div>

        {error && (
          <div className="mt-4">
            <Banner tone="error">{error}</Banner>
          </div>
        )}

        <label className="btn-ghost btn-block mt-5 cursor-pointer">
          {file ? 'Changer de photo' : 'Choisir une photo'}
          <input type="file" accept="image/*" className="hidden" onChange={pick} />
        </label>

        <button className="btn-primary btn-block mt-3" disabled={!file || busy} onClick={submit}>
          {busy ? 'Envoi…' : 'Valider ma photo'}
        </button>

        <p className="mt-4 text-xs text-muted">
          Connecté en tant que {user?.email} ·{' '}
          <button onClick={logout} className="font-semibold text-brand underline">
            Se déconnecter
          </button>
        </p>
      </div>
    </div>
  );
}
