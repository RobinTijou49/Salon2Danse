// Icône (emoji) associée à chaque mission, pour l'affichage des cartes planning.
const MAP: Record<string, string> = {
  'Accueil exposants': '🤝',
  Vestiaires: '🧥',
  'Point Info': 'ℹ️',
  'Masterclass / Conférences': '🎤',
  'Loges danseurs': '🩰',
  'Logistique (Niveau 0 et -2)': '📦',
  'Scène principale': '🎭',
  'Stand JayDance': '🎪',
  'Village Danses du Monde': '🌍',
  Billetterie: '🎟️',
  Caisse: '💳',
};

export function missionIcon(name: string): string {
  return MAP[name] ?? '⭐';
}
