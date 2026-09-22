// Logotype texte aux couleurs de la marque.
// Pour utiliser le logo officiel : dépose le fichier dans web/public/logo.png
// et remplace ce composant par <img src="/logo.png" alt="Salon de la Danse" />.
export function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const main = variant === 'light' ? 'text-white' : 'text-brand';
  const sub = variant === 'light' ? 'text-white/70' : 'text-muted';
  return (
    <div className="flex flex-col leading-none">
      <span className={`font-display font-extrabold tracking-tight text-lg ${main}`}>
        SALON<span className="font-light"> DE LA </span>DANSE
      </span>
      <span className={`font-display text-[10px] font-semibold uppercase tracking-[.22em] ${sub}`}>
        Angers · Espace bénévoles
      </span>
    </div>
  );
}
