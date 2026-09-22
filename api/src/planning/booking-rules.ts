// Règles métier de composition du planning — logique PURE, sans base de
// données, donc testable unitairement (voir booking-rules.spec.ts).
// La jauge (capacité) est vérifiée à part, au niveau transactionnel, car
// elle dépend de l'état concurrent de la base.

export type SlotRef = {
  dayId: string;
  indexInDay: number; // 0..4
  timeSlotId: string;
};

export type BookingBlockReason =
  | 'WINDOW_CLOSED' // hors période d'inscription ou planning verrouillé
  | 'PLANNING_LOCKED' // le bénévole a déjà validé définitivement
  | 'MAX_REACHED' // quota de créneaux atteint
  | 'ALREADY_ON_SLOT' // déjà une mission sur ce créneau horaire
  | 'THREE_CONSECUTIVE'; // interdirait 3 créneaux d'affilée

export type RuleResult = { ok: true } | { ok: false; reason: BookingBlockReason };

export type RuleContext = {
  current: SlotRef[]; // réservations existantes du bénévole
  candidate: SlotRef; // créneau visé
  maxSlots: number;
  windowOpen: boolean;
  planningLocked: boolean;
};

/** Vrai s'il existe 3 tranches horaires consécutives dans la liste. */
export function hasThreeConsecutive(indices: number[]): boolean {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run++;
      if (run >= 3) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

/** Peut-on ajouter le créneau candidat au planning courant ? */
export function canAddBooking(ctx: RuleContext): RuleResult {
  if (ctx.planningLocked) return { ok: false, reason: 'PLANNING_LOCKED' };
  if (!ctx.windowOpen) return { ok: false, reason: 'WINDOW_CLOSED' };
  if (ctx.current.length >= ctx.maxSlots) return { ok: false, reason: 'MAX_REACHED' };
  if (ctx.current.some((b) => b.timeSlotId === ctx.candidate.timeSlotId)) {
    return { ok: false, reason: 'ALREADY_ON_SLOT' };
  }
  const sameDayIndices = ctx.current
    .filter((b) => b.dayId === ctx.candidate.dayId)
    .map((b) => b.indexInDay);
  if (hasThreeConsecutive([...sameDayIndices, ctx.candidate.indexInDay])) {
    return { ok: false, reason: 'THREE_CONSECUTIVE' };
  }
  return { ok: true };
}

/** Message lisible associé à un motif de blocage. */
export function reasonLabel(reason: BookingBlockReason): string {
  switch (reason) {
    case 'WINDOW_CLOSED':
      return "Les inscriptions ne sont pas ouvertes.";
    case 'PLANNING_LOCKED':
      return 'Ton planning est validé et verrouillé.';
    case 'MAX_REACHED':
      return 'Tu as atteint le maximum de créneaux.';
    case 'ALREADY_ON_SLOT':
      return 'Tu as déjà une mission sur ce créneau.';
    case 'THREE_CONSECUTIVE':
      return '3 créneaux d\'affilée sont interdits (pause obligatoire).';
  }
}
