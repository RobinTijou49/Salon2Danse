// Logo officiel du Salon de la Danse (version blanche : à poser sur fond de marque).
// Fichier : web/public/logo.png
export function Logo({
  className = 'h-9 w-auto',
}: {
  className?: string;
  variant?: 'dark' | 'light';
}) {
  return <img src="/logo.png" alt="Salon de la Danse — Angers" className={className} />;
}
