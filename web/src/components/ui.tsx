import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error' | 'warn';
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    info: 'bg-brand-50 text-brand border-brand/20',
    success: 'bg-okbg text-ok border-ok/25',
    error: 'bg-red-50 text-red-700 border-red-200',
    warn: 'bg-warnbg text-warn border-warn/25',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>
  );
}

// Boîte de dialogue de confirmation
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  if (!open) return null;
  return createPortal(
    <div className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      <div className="card anim-pop max-h-[85vh] w-full max-w-sm overflow-auto p-5">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <div className="mt-2 text-sm text-muted">{body}</div>
        <div className="mt-5 flex gap-3">
          <button className="btn-ghost btn-block" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button className="btn-primary btn-block" onClick={onConfirm} disabled={busy}>
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
