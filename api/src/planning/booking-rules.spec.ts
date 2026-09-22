import { canAddBooking, hasThreeConsecutive, RuleContext, SlotRef } from './booking-rules';

const slot = (dayId: string, indexInDay: number): SlotRef => ({
  dayId,
  indexInDay,
  timeSlotId: `${dayId}-${indexInDay}`,
});

const base = (current: SlotRef[], candidate: SlotRef): RuleContext => ({
  current,
  candidate,
  maxSlots: 3,
  windowOpen: true,
  planningLocked: false,
});

describe('hasThreeConsecutive', () => {
  it('détecte 3 indices consécutifs', () => {
    expect(hasThreeConsecutive([0, 1, 2])).toBe(true);
    expect(hasThreeConsecutive([2, 3, 4, 0])).toBe(true);
  });
  it('tolère 2 consécutifs', () => {
    expect(hasThreeConsecutive([0, 1, 3, 4])).toBe(false);
  });
});

describe('canAddBooking', () => {
  it('accepte un premier créneau', () => {
    expect(canAddBooking(base([], slot('J1', 0))).ok).toBe(true);
  });

  it('refuse hors fenêtre d\'inscription', () => {
    const ctx = { ...base([], slot('J1', 0)), windowOpen: false };
    expect(canAddBooking(ctx)).toEqual({ ok: false, reason: 'WINDOW_CLOSED' });
  });

  it('refuse si planning verrouillé', () => {
    const ctx = { ...base([], slot('J1', 0)), planningLocked: true };
    expect(canAddBooking(ctx)).toEqual({ ok: false, reason: 'PLANNING_LOCKED' });
  });

  it('refuse au-delà du maximum de créneaux', () => {
    const current = [slot('J1', 0), slot('J2', 0), slot('J3', 0)];
    expect(canAddBooking(base(current, slot('J1', 2)))).toEqual({
      ok: false,
      reason: 'MAX_REACHED',
    });
  });

  it('refuse deux missions sur le même créneau', () => {
    const current = [slot('J1', 2)];
    expect(canAddBooking(base(current, slot('J1', 2)))).toEqual({
      ok: false,
      reason: 'ALREADY_ON_SLOT',
    });
  });

  it('refuse 3 créneaux consécutifs le même jour', () => {
    const current = [slot('J1', 0), slot('J1', 1)];
    expect(canAddBooking(base(current, slot('J1', 2)))).toEqual({
      ok: false,
      reason: 'THREE_CONSECUTIVE',
    });
  });

  it('accepte 3 créneaux non consécutifs le même jour', () => {
    const current = [slot('J1', 0), slot('J1', 2)];
    expect(canAddBooking(base(current, slot('J1', 4)))).toEqual({ ok: true });
  });

  it('accepte des créneaux consécutifs sur des jours différents', () => {
    const current = [slot('J1', 0), slot('J1', 1)];
    expect(canAddBooking(base(current, slot('J2', 2)))).toEqual({ ok: true });
  });
});
