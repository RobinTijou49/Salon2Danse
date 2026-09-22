import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { canAddBooking, reasonLabel, SlotRef } from './booking-rules';

type Edition = {
  id: string;
  isLocked: boolean;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  minSlots: number;
  maxSlots: number;
  orangeThresholdPct: number;
};

@Injectable()
export class PlanningService {
  constructor(private readonly prisma: PrismaService) {}

  private windowOpen(edition: Edition): boolean {
    if (edition.isLocked) return false;
    const now = new Date();
    if (edition.registrationOpensAt && now < edition.registrationOpensAt) return false;
    if (edition.registrationClosesAt && now > edition.registrationClosesAt) return false;
    return true;
  }

  private async profileOrThrow(userId: string) {
    const profile = await this.prisma.volunteerProfile.findUnique({
      where: { userId },
      include: { edition: true },
    });
    if (!profile) {
      throw new ForbiddenException('Aucun profil bénévole associé à ce compte.');
    }
    return profile;
  }

  private async currentSlots(volunteerProfileId: string): Promise<SlotRef[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { volunteerProfileId },
      include: { timeSlot: true },
    });
    return bookings.map((b) => ({
      dayId: b.timeSlot.dayId,
      indexInDay: b.timeSlot.indexInDay,
      timeSlotId: b.timeSlotId,
    }));
  }

  /** Vue des disponibilités pour le bénévole connecté. Ne révèle jamais
   * les noms des autres participants — uniquement des compteurs. */
  async availability(userId: string) {
    const profile = await this.profileOrThrow(userId);
    const edition = profile.edition as Edition;
    const windowOpen = this.windowOpen(edition);
    const planningLocked = profile.planningStatus === 'VALIDATED';

    const days = await this.prisma.day.findMany({
      where: { editionId: edition.id },
      orderBy: { date: 'asc' },
      include: {
        timeSlots: {
          orderBy: { indexInDay: 'asc' },
          include: {
            missionSlots: { include: { mission: true } },
          },
        },
      },
    });

    // Compteurs de réservation par créneau réservable (draft + validé occupent la jauge).
    const grouped = await this.prisma.booking.groupBy({
      by: ['missionSlotId'],
      _count: { _all: true },
    });
    const takenBy = new Map<string, number>();
    for (const g of grouped) takenBy.set(g.missionSlotId, g._count._all);

    const mine = await this.currentSlots(profile.id);
    const myMissionSlotIds = new Set(
      (
        await this.prisma.booking.findMany({
          where: { volunteerProfileId: profile.id },
          select: { missionSlotId: true },
        })
      ).map((b) => b.missionSlotId),
    );

    const result = days.map((day) => ({
      id: day.id,
      label: day.label,
      date: day.date,
      slots: day.timeSlots.map((ts) => ({
        timeSlotId: ts.id,
        indexInDay: ts.indexInDay,
        startTime: ts.startTime,
        endTime: ts.endTime,
        missions: ts.missionSlots
          .filter((ms) => ms.mission.isPublic) // les missions sensibles restent invisibles
          .map((ms) => {
            const taken = takenBy.get(ms.id) ?? 0;
            const remaining = Math.max(0, ms.capacity - taken);
            const bookedByMe = myMissionSlotIds.has(ms.id);
            const candidate: SlotRef = {
              dayId: day.id,
              indexInDay: ts.indexInDay,
              timeSlotId: ts.id,
            };
            const rule = canAddBooking({
              current: mine,
              candidate,
              maxSlots: edition.maxSlots,
              windowOpen,
              planningLocked,
            });
            const orangeAt = Math.ceil((ms.capacity * edition.orangeThresholdPct) / 100);

            let state:
              | 'MINE'
              | 'GREEN'
              | 'ORANGE'
              | 'FULL'
              | 'UNAVAILABLE';
            let reason: string | null = null;

            if (bookedByMe) {
              state = 'MINE';
            } else if (remaining <= 0) {
              state = 'FULL';
            } else if (!rule.ok) {
              state = 'UNAVAILABLE';
              reason = reasonLabel(rule.reason);
            } else {
              state = remaining <= orangeAt ? 'ORANGE' : 'GREEN';
            }

            return {
              missionSlotId: ms.id,
              missionId: ms.missionId,
              missionName: ms.mission.name,
              location: ms.mission.location,
              capacity: ms.capacity,
              remaining,
              state,
              bookedByMe,
              reservable: !bookedByMe && remaining > 0 && rule.ok,
              reason,
            };
          }),
      })),
    }));

    return {
      edition: {
        id: edition.id,
        minSlots: edition.minSlots,
        maxSlots: edition.maxSlots,
        windowOpen,
      },
      planningStatus: profile.planningStatus,
      myBookingsCount: mine.length,
      days: result,
    };
  }

  /** Réserve un créneau. Toutes les règles + la jauge sont vérifiées
   * côté serveur, dans une transaction avec verrou de ligne (anti-surbooking). */
  async book(userId: string, missionSlotId: string) {
    const profile = await this.profileOrThrow(userId);
    const edition = profile.edition as Edition;

    if (profile.planningStatus === 'VALIDATED') {
      throw new ForbiddenException('Ton planning est validé et verrouillé.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const ms = await tx.missionSlot.findUnique({
          where: { id: missionSlotId },
          include: { mission: true, timeSlot: true },
        });
        if (!ms) throw new NotFoundException('Créneau introuvable.');
        if (!ms.mission.isPublic) {
          throw new ForbiddenException('Cette mission est attribuée par un administrateur.');
        }

        const current = await this.currentSlots(profile.id);
        const rule = canAddBooking({
          current,
          candidate: {
            dayId: ms.timeSlot.dayId,
            indexInDay: ms.timeSlot.indexInDay,
            timeSlotId: ms.timeSlotId,
          },
          maxSlots: edition.maxSlots,
          windowOpen: this.windowOpen(edition),
          planningLocked: false,
        });
        if (!rule.ok) throw new ForbiddenException(reasonLabel(rule.reason));

        // Verrou de ligne sur le créneau : sérialise les réservations
        // concurrentes → jauge jamais dépassée.
        await tx.$queryRaw`SELECT id FROM MissionSlot WHERE id = ${missionSlotId} FOR UPDATE`;
        const taken = await tx.booking.count({ where: { missionSlotId } });
        if (taken >= ms.capacity) {
          throw new ConflictException('Ce créneau est complet.');
        }

        await tx.booking.create({
          data: {
            volunteerProfileId: profile.id,
            missionSlotId,
            timeSlotId: ms.timeSlotId,
            status: 'DRAFT',
          },
        });
        return { ok: true };
      });
    } catch (e: any) {
      // Filet de sécurité : la contrainte d'unicité BDD attrape les doublons
      // même en cas de course.
      if (e?.code === 'P2002') {
        throw new ConflictException('Tu as déjà une mission sur ce créneau.');
      }
      throw e;
    }
  }

  /** Annule une réservation en brouillon. */
  async unbook(userId: string, bookingId: string) {
    const profile = await this.profileOrThrow(userId);
    if (profile.planningStatus === 'VALIDATED') {
      throw new ForbiddenException('Ton planning est validé et verrouillé.');
    }
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking || booking.volunteerProfileId !== profile.id) {
      throw new NotFoundException('Réservation introuvable.');
    }
    await this.prisma.booking.delete({ where: { id: bookingId } });
    return { ok: true };
  }

  /** Validation définitive : verrouille le planning du bénévole. */
  async validate(userId: string) {
    const profile = await this.profileOrThrow(userId);
    const edition = profile.edition as Edition;
    if (profile.planningStatus === 'VALIDATED') {
      throw new BadRequestException('Ton planning est déjà validé.');
    }
    const count = await this.prisma.booking.count({
      where: { volunteerProfileId: profile.id },
    });
    if (count < edition.minSlots) {
      throw new BadRequestException(
        `Il te faut au moins ${edition.minSlots} créneau(x) pour valider.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.booking.updateMany({
        where: { volunteerProfileId: profile.id },
        data: { status: 'VALIDATED' },
      }),
      this.prisma.volunteerProfile.update({
        where: { id: profile.id },
        data: { planningStatus: 'VALIDATED', planningValidatedAt: new Date() },
      }),
    ]);
    return { ok: true, validatedSlots: count };
  }

  /** Récapitulatif des missions du bénévole. */
  async myPlanning(userId: string) {
    const profile = await this.profileOrThrow(userId);
    const bookings = await this.prisma.booking.findMany({
      where: { volunteerProfileId: profile.id },
      include: {
        missionSlot: { include: { mission: true } },
        timeSlot: { include: { day: true } },
      },
    });
    const items = bookings
      .map((b) => ({
        bookingId: b.id,
        status: b.status,
        missionSlotId: b.missionSlotId,
        mission: b.missionSlot.mission.name,
        location: b.missionSlot.mission.location,
        day: b.timeSlot.day.label,
        date: b.timeSlot.day.date,
        indexInDay: b.timeSlot.indexInDay,
        startTime: b.timeSlot.startTime,
        endTime: b.timeSlot.endTime,
      }))
      .sort((a, b) =>
        a.date === b.date
          ? a.indexInDay - b.indexInDay
          : a.date < b.date
            ? -1
            : 1,
      );
    return {
      planningStatus: profile.planningStatus,
      count: items.length,
      items,
    };
  }
}
