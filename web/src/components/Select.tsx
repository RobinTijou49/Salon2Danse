import { useEffect, useRef, useState } from 'react';

export type Option = { value: string; label: string };

// Dropdown personnalisé : contrairement au <select> natif, la liste ouverte
// est stylable (survol terracotta, coins arrondis, animation).
export function Select({
  value,
  onChange,
  options,
  placeholder,
  tone = 'light',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  tone?: 'light' | 'brand';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isBrand = tone === 'brand';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);
  const label = current?.label ?? placeholder ?? '';

  return (
    <div ref={ref} className={`relative ${isBrand ? 'inline-block' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={
          isBrand
            ? 'flex items-center justify-between gap-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white outline-none hover:bg-white/20'
            : 'flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3 text-left text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10'
        }
      >
        <span className={`truncate ${current ? '' : isBrand ? '' : 'text-muted'}`}>{label}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${
            isBrand ? 'text-white' : 'text-muted'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={`anim-pop absolute z-40 mt-1.5 max-h-64 overflow-auto rounded-xl border border-line bg-white p-1 shadow-card ${
            isBrand ? 'right-0 min-w-[200px]' : 'w-full'
          }`}
        >
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={sel}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm transition ${
                  sel ? 'bg-brand font-semibold text-white' : 'text-ink hover:bg-brand-50'
                }`}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
