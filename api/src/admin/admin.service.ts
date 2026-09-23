import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const SLOTS = [
  ['08:30', '10:00'],
  ['10:00', '12:00'],
  ['12:00', '14:00'],
  ['14:00', '16:00'],
  ['16:00', '18:00'],
];
const PUBLIC_MISSIONS = [
  'Accueil exposants', 'Vestiaires', 'Point Info', 'Masterclass / Conférences',
  'Loges danseurs', 'Logistique (Niveau 0 et -2)', 'Scène principale',
  'Stand JayDance', 'Village Danses du Monde',
];
const SENSITIVE_MISSIONS = ['Billetterie', 'Caisse'];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Édition courante par défaut : la plus récente non archivée. */
  private async currentEditionId(editionId?: string): Promise<string | undefined> {
    if (editionId) return editionId;
    const e = await this.prisma.edition.findFirst({
      orderBy: [{ isArchived: 'asc' }, { startDate: 'desc' }],
    });
    return e?.id;
  }

  private async audit(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        before: (before ?? undefined) as any,
        after: (after ?? undefined) as any,
      },
    });
  }

  // ---- Tableau de bord ----
  async stats(editionIdParam?: string) {
    const editionId = await this.currentEditionId(editionIdParam);
    const [total, validated, minorsPending, slots, counts] = await Promise.all([
      this.prisma.volunteerProfile.count({ where: { editionId } }),
      this.prisma.volunteerProfile.count({ where: { editionId, planningStatus: 'VALIDATED' } }),
      this.prisma.volunteerProfile.count({
        where: { editionId, isMinor: true, validationStatus: 'PENDING' },
      }),
      this.prisma.missionSlot.findMany({
        where: { mission: { editionId } },
        include: { mission: true, timeSlot: { include: { day: true } } },
      }),
      this.prisma.booking.groupBy({ by: ['missionSlotId'], _count: { _all: true } }),
    ]);

    const takenBy = new Map<string, number>();
    for (const c of counts) takenBy.set(c.missionSlotId, c._count._all);

    const perDay = new Map<string, { capacity: number; taken: number }>();
    const perMission = new Map<string, { capacity: number; taken: number }>();
    const understaffed: {
      day: string;
      time: string;
      mission: string;
      capacity: number;
      taken: number;
      remaining: number;
    }[] = [];
    let capacityTotal = 0;
    let takenTotal = 0;

    for (const s of slots) {
      if (!s.mission.isPublic) continue;
      const taken = takenBy.get(s.id) ?? 0;
      capacityTotal += s.capacity;
      takenTotal += taken;

      const d = perDay.get(s.timeSlot.day.label) ?? { capacity: 0, taken: 0 };
      d.capacity += s.capacity;
      d.taken += taken;
      perDay.set(s.timeSlot.day.label, d);

      const m = perMission.get(s.mission.name) ?? { capacity: 0, taken: 0 };
      m.capacity += s.capacity;
      m.taken += taken;
      perMission.set(s.mission.name, m);

      const remaining = s.capacity - taken;
      if (remaining > 0) {
        understaffed.push({
          day: s.timeSlot.day.label,
          time: `${s.timeSlot.startTime}–${s.timeSlot.endTime}`,
          mission: s.mission.name,
          capacity: s.capacity,
          taken,
          remaining,
        });
      }
    }
    understaffed.sort((a, b) => b.remaining - a.remaining);

    const rate = (t: number, c: number) => (c > 0 ? Math.round((t / c) * 100) : 0);
    return {
      totalVolunteers: total,
      planningValidated: validated,
      planningDraft: total - validated,
      minorsPending,
      fillRate: rate(takenTotal, capacityTotal),
      capacityTotal,
      takenTotal,
      perDay: [...perDay.entries()].map(([label, v]) => ({
        label,
        ...v,
        rate: rate(v.taken, v.capacity),
      })),
      perMission: [...perMission.entries()]
        .map(([name, v]) => ({ name, ...v, rate: rate(v.taken, v.capacity) }))
        .sort((a, b) => a.rate - b.rate),
      understaffed: understaffed.slice(0, 12),
    };
  }

  async meta() {
    const [days, missions] = await Promise.all([
      this.prisma.day.findMany({ orderBy: { date: 'asc' }, select: { id: true, label: true } }),
      this.prisma.mission.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, isPublic: true },
      }),
    ]);
    return { days, missions };
  }

  // ---- Recherche bénévoles ----
  async volunteers(q: {
    search?: string;
    status?: string;
    planning?: string;
    dayId?: string;
    missionId?: string;
    editionId?: string;
    page?: number;
  }) {
    const take = 20;
    const page = Math.max(1, Number(q.page) || 1);
    const editionId = await this.currentEditionId(q.editionId);
    const AND: any[] = [{ editionId }];
    if (q.search) {
      AND.push({
        OR: [
          { firstName: { contains: q.search } },
          { lastName: { contains: q.search } },
          { user: { email: { contains: q.search } } },
        ],
      });
    }
    if (q.status) AND.push({ validationStatus: q.status });
    if (q.planning) AND.push({ planningStatus: q.planning });
    if (q.dayId || q.missionId) {
      AND.push({
        bookings: {
          some: {
            ...(q.dayId ? { timeSlot: { dayId: q.dayId } } : {}),
            ...(q.missionId ? { missionSlot: { missionId: q.missionId } } : {}),
          },
        },
      });
    }
    const where = AND.length ? { AND } : {};
    const [total, rows] = await Promise.all([
      this.prisma.volunteerProfile.count({ where }),
      this.prisma.volunteerProfile.findMany({
        where,
        include: { user: { select: { email: true } }, _count: { select: { bookings: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take,
        skip: (page - 1) * take,
      }),
    ]);
    return {
      total,
      page,
      pageSize: take,
      pages: Math.ceil(total / take),
      items: rows.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.user.email,
        phone: p.phone,
        isMinor: p.isMinor,
        hasPhoto: !!p.photoKey,
        validationStatus: p.validationStatus,
        planningStatus: p.planningStatus,
        bookingsCount: p._count.bookings,
      })),
    };
  }

  async volunteerDetail(id: string) {
    const p = await this.prisma.volunteerProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        bookings: {
          include: {
            missionSlot: { include: { mission: true } },
            timeSlot: { include: { day: true } },
          },
        },
      },
    });
    if (!p) throw new NotFoundException('Bénévole introuvable.');
    return {
      id: p.id,
      userId: p.user.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.user.email,
      phone: p.phone,
      isMinor: p.isMinor,
      hasPhoto: !!p.photoKey,
      validationStatus: p.validationStatus,
      planningStatus: p.planningStatus,
      bookings: p.bookings
        .map((b) => ({
          bookingId: b.id,
          mission: b.missionSlot.mission.name,
          isPublic: b.missionSlot.mission.isPublic,
          day: b.timeSlot.day.label,
          date: b.timeSlot.day.date,
          indexInDay: b.timeSlot.indexInDay,
          startTime: b.timeSlot.startTime,
          endTime: b.timeSlot.endTime,
        }))
        .sort((a, b) =>
          a.date === b.date ? a.indexInDay - b.indexInDay : a.date < b.date ? -1 : 1,
        ),
    };
  }

  // ---- Actions d'override ----
  async validateProfile(actor: string, id: string) {
    const p = await this.prisma.volunteerProfile.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Bénévole introuvable.');
    await this.prisma.volunteerProfile.update({
      where: { id },
      data: { validationStatus: 'VALIDATED' },
    });
    await this.audit(actor, 'VALIDATE_PROFILE', 'VolunteerProfile', id,
      { validationStatus: p.validationStatus }, { validationStatus: 'VALIDATED' });
    return { ok: true };
  }

  async unlockPlanning(actor: string, id: string) {
    const p = await this.prisma.volunteerProfile.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Bénévole introuvable.');
    await this.prisma.$transaction([
      this.prisma.booking.updateMany({ where: { volunteerProfileId: id }, data: { status: 'DRAFT' } }),
      this.prisma.volunteerProfile.update({
        where: { id },
        data: { planningStatus: 'DRAFT', planningValidatedAt: null },
      }),
    ]);
    await this.audit(actor, 'UNLOCK_PLANNING', 'VolunteerProfile', id,
      { planningStatus: p.planningStatus }, { planningStatus: 'DRAFT' });
    return { ok: true };
  }

  async resetPassword(actor: string, id: string) {
    const p = await this.prisma.volunteerProfile.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Bénévole introuvable.');
    const tempPassword = randomBytes(6).toString('base64url');
    const passwordHash = await argon2.hash(tempPassword);
    await this.prisma.user.update({ where: { id: p.userId }, data: { passwordHash } });
    await this.audit(actor, 'RESET_PASSWORD', 'User', p.userId);
    return { tempPassword };
  }

  async updateIdentity(
    actor: string,
    id: string,
    dto: { firstName?: string; lastName?: string; phone?: string; isMinor?: boolean; email?: string },
  ) {
    const p = await this.prisma.volunteerProfile.findUnique({ where: { id }, include: { user: true } });
    if (!p) throw new NotFoundException('Bénévole introuvable.');

    if (dto.email && dto.email.toLowerCase() !== p.user.email) {
      const email = dto.email.trim().toLowerCase();
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists) throw new ConflictException('Cet e-mail est déjà utilisé.');
      await this.prisma.user.update({ where: { id: p.userId }, data: { email } });
    }
    const before = { firstName: p.firstName, lastName: p.lastName, phone: p.phone, isMinor: p.isMinor };
    const updated = await this.prisma.volunteerProfile.update({
      where: { id },
      data: {
        firstName: dto.firstName?.trim() ?? p.firstName,
        lastName: dto.lastName?.trim() ?? p.lastName,
        phone: dto.phone?.trim() ?? p.phone,
        isMinor: dto.isMinor ?? p.isMinor,
      },
    });
    await this.audit(actor, 'UPDATE_IDENTITY', 'VolunteerProfile', id, before, {
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      isMinor: updated.isMinor,
    });
    return { ok: true };
  }

  /** Attribution forcée (postes sensibles inclus) — outrepasse les règles. */
  async assign(actor: string, id: string, missionSlotId: string) {
    const p = await this.prisma.volunteerProfile.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Bénévole introuvable.');
    const ms = await this.prisma.missionSlot.findUnique({ where: { id: missionSlotId } });
    if (!ms) throw new NotFoundException('Créneau introuvable.');
    try {
      await this.prisma.booking.create({
        data: {
          volunteerProfileId: id,
          missionSlotId,
          timeSlotId: ms.timeSlotId,
          status: p.planningStatus === 'VALIDATED' ? 'VALIDATED' : 'DRAFT',
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Ce bénévole a déjà une mission sur ce créneau.');
      }
      throw e;
    }
    await this.audit(actor, 'FORCE_ASSIGN', 'Booking', missionSlotId, null, { volunteerProfileId: id });
    return { ok: true };
  }

  async removeBooking(actor: string, bookingId: string) {
    const b = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Réservation introuvable.');
    await this.prisma.booking.delete({ where: { id: bookingId } });
    await this.audit(actor, 'REMOVE_BOOKING', 'Booking', bookingId, b, null);
    return { ok: true };
  }

  // ---- Multi-éditions ----
  async editions() {
    const list = await this.prisma.edition.findMany({
      orderBy: [{ isArchived: 'asc' }, { startDate: 'desc' }],
    });
    return Promise.all(
      list.map(async (e) => ({
        id: e.id,
        name: e.name,
        startDate: e.startDate,
        endDate: e.endDate,
        isArchived: e.isArchived,
        isLocked: e.isLocked,
        volunteers: await this.prisma.volunteerProfile.count({ where: { editionId: e.id } }),
      })),
    );
  }

  /** Crée une édition avec sa structure complète (jours, créneaux, missions) + codes. */
  async createEdition(actor: string, dto: { name: string; startDate: string }) {
    const start = new Date(dto.startDate);
    const edition = await this.prisma.edition.create({
      data: {
        name: dto.name,
        startDate: start,
        endDate: new Date(start.getTime() + 2 * 86400000),
        registrationOpensAt: new Date(),
        registrationClosesAt: new Date(start.getTime() - 86400000),
      },
    });

    const missions: { id: string; defaultCapacity: number }[] = [];
    for (const name of PUBLIC_MISSIONS) {
      missions.push(
        await this.prisma.mission.create({
          data: { editionId: edition.id, name, isPublic: true, defaultCapacity: 4 },
        }),
      );
    }
    for (const name of SENSITIVE_MISSIONS) {
      missions.push(
        await this.prisma.mission.create({
          data: { editionId: edition.id, name, isPublic: false, defaultCapacity: 2 },
        }),
      );
    }

    for (let d = 0; d < 3; d++) {
      const date = new Date(start.getTime() + d * 86400000);
      const raw = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const day = await this.prisma.day.create({
        data: { editionId: edition.id, date, label: raw.charAt(0).toUpperCase() + raw.slice(1) },
      });
      for (let i = 0; i < SLOTS.length; i++) {
        const ts = await this.prisma.timeSlot.create({
          data: { dayId: day.id, indexInDay: i, startTime: SLOTS[i][0], endTime: SLOTS[i][1] },
        });
        for (const m of missions) {
          await this.prisma.missionSlot.create({
            data: { missionId: m.id, timeSlotId: ts.id, capacity: m.defaultCapacity },
          });
        }
      }
    }

    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      await this.prisma.invitationCode.create({
        data: {
          editionId: edition.id,
          codeHash: createHash('sha256').update(code).digest('hex'),
          plainCode: code,
        },
      });
    }

    await this.audit(actor, 'CREATE_EDITION', 'Edition', edition.id, null, { name: dto.name });
    return { id: edition.id, codes };
  }

  async setArchived(actor: string, id: string, archived: boolean) {
    await this.prisma.edition.update({ where: { id }, data: { isArchived: archived } });
    await this.audit(actor, archived ? 'ARCHIVE_EDITION' : 'UNARCHIVE_EDITION', 'Edition', id);
    return { ok: true };
  }

  /** Génère des codes d'invitation en lot. Le clair n'est renvoyé qu'ICI,
   * une seule fois (la base ne stocke que le haché). */
  async generateCodes(actor: string, editionId: string, countRaw: number) {
    const count = Math.min(Math.max(1, Math.floor(countRaw) || 0), 500);
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      await this.prisma.invitationCode.create({
        data: {
          editionId,
          codeHash: createHash('sha256').update(code).digest('hex'),
          plainCode: code,
        },
      });
    }
    await this.audit(actor, 'GENERATE_CODES', 'Edition', editionId, null, { count });
    return { codes };
  }

  /** Export CSV de tous les codes d'une édition (clair + statut). */
  async exportCodesCsv(editionId: string, res: Response) {
    const codes = await this.prisma.invitationCode.findMany({
      where: { editionId },
      orderBy: { createdAt: 'asc' },
    });
    const lines = ['Code;Statut'];
    for (const c of codes) {
      lines.push(
        [this.csvField(c.plainCode ?? '(généré avant stockage)'), c.status].join(';'),
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="codes-invitation.csv"');
    res.end('﻿' + lines.join('\r\n'));
  }

  /** Suivi d'utilisation des codes d'une édition. */
  async codeStats(editionId: string) {
    const [available, consumed, revoked] = await Promise.all([
      this.prisma.invitationCode.count({ where: { editionId, status: 'AVAILABLE' } }),
      this.prisma.invitationCode.count({ where: { editionId, status: 'CONSUMED' } }),
      this.prisma.invitationCode.count({ where: { editionId, status: 'REVOKED' } }),
    ]);
    return { available, consumed, revoked, total: available + consumed + revoked };
  }

  /** Envoie le rappel J-3 aux bénévoles au planning validé. */
  async sendReminders(actor: string, editionIdParam?: string) {
    const editionId = await this.currentEditionId(editionIdParam);
    const profiles = await this.prisma.volunteerProfile.findMany({
      where: { editionId, planningStatus: 'VALIDATED' },
      include: {
        user: { select: { email: true } },
        bookings: {
          include: {
            missionSlot: { include: { mission: true } },
            timeSlot: { include: { day: true } },
          },
        },
      },
    });
    let sent = 0;
    for (const p of profiles) {
      const missions = p.bookings
        .map((b) => ({
          day: b.timeSlot.day.label,
          date: b.timeSlot.day.date,
          indexInDay: b.timeSlot.indexInDay,
          startTime: b.timeSlot.startTime,
          endTime: b.timeSlot.endTime,
          mission: b.missionSlot.mission.name,
        }))
        .sort((a, b) => (a.date === b.date ? a.indexInDay - b.indexInDay : a.date < b.date ? -1 : 1));
      this.mail.reminder(p.user.email, p.firstName, missions);
      sent++;
    }
    await this.audit(actor, 'SEND_REMINDERS', 'Edition', editionId || '', null, { count: sent });
    return { sent };
  }

  // ---- Journal d'audit ----
  async auditLog() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { email: true } } },
    });
    return logs.map((l) => ({
      id: l.id,
      actor: l.actor?.email ?? 'système',
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      before: l.before,
      after: l.after,
      createdAt: l.createdAt,
    }));
  }

  // ---- Exports ----
  private async rows() {
    const profiles = await this.prisma.volunteerProfile.findMany({
      include: {
        user: { select: { email: true } },
        bookings: {
          include: {
            missionSlot: { include: { mission: true } },
            timeSlot: { include: { day: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return profiles;
  }

  private csvField(v: unknown) {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  async exportVolunteersCsv(res: Response) {
    const profiles = await this.rows();
    const header = ['Nom', 'Prénom', 'E-mail', 'Téléphone', 'Mineur', 'Validation', 'Planning', 'Créneaux'];
    const lines = [header.join(';')];
    for (const p of profiles) {
      lines.push(
        [
          p.lastName,
          p.firstName,
          p.user.email,
          p.phone,
          p.isMinor ? 'Oui' : 'Non',
          p.validationStatus,
          p.planningStatus,
          p.bookings.length,
        ]
          .map((f) => this.csvField(f))
          .join(';'),
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="benevoles.csv"');
    res.end('﻿' + lines.join('\r\n')); // BOM pour Excel
  }

  async exportPlanningCsv(res: Response) {
    const profiles = await this.rows();
    const header = ['Nom', 'Prénom', 'E-mail', 'Jour', 'Début', 'Fin', 'Mission', 'Statut'];
    const lines = [header.join(';')];
    for (const p of profiles) {
      for (const b of p.bookings) {
        lines.push(
          [
            p.lastName,
            p.firstName,
            p.user.email,
            b.timeSlot.day.label,
            b.timeSlot.startTime,
            b.timeSlot.endTime,
            b.missionSlot.mission.name,
            b.status,
          ]
            .map((f) => this.csvField(f))
            .join(';'),
        );
      }
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="planning.csv"');
    res.end('﻿' + lines.join('\r\n'));
  }

  async exportXlsx(res: Response) {
    const profiles = await this.rows();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Salon de la Danse';

    const s1 = wb.addWorksheet('Bénévoles');
    s1.columns = [
      { header: 'Nom', key: 'nom', width: 18 },
      { header: 'Prénom', key: 'prenom', width: 18 },
      { header: 'E-mail', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'tel', width: 16 },
      { header: 'Mineur', key: 'mineur', width: 8 },
      { header: 'Validation', key: 'val', width: 12 },
      { header: 'Planning', key: 'plan', width: 12 },
      { header: 'Créneaux', key: 'nb', width: 10 },
    ];
    s1.getRow(1).font = { bold: true };
    for (const p of profiles) {
      s1.addRow({
        nom: p.lastName,
        prenom: p.firstName,
        email: p.user.email,
        tel: p.phone,
        mineur: p.isMinor ? 'Oui' : 'Non',
        val: p.validationStatus,
        plan: p.planningStatus,
        nb: p.bookings.length,
      });
    }

    const s2 = wb.addWorksheet('Planning');
    s2.columns = [
      { header: 'Nom', key: 'nom', width: 18 },
      { header: 'Prénom', key: 'prenom', width: 18 },
      { header: 'Jour', key: 'jour', width: 22 },
      { header: 'Début', key: 'debut', width: 8 },
      { header: 'Fin', key: 'fin', width: 8 },
      { header: 'Mission', key: 'mission', width: 28 },
      { header: 'Statut', key: 'statut', width: 12 },
    ];
    s2.getRow(1).font = { bold: true };
    for (const p of profiles) {
      for (const b of p.bookings) {
        s2.addRow({
          nom: p.lastName,
          prenom: p.firstName,
          jour: b.timeSlot.day.label,
          debut: b.timeSlot.startTime,
          fin: b.timeSlot.endTime,
          mission: b.missionSlot.mission.name,
          statut: b.status,
        });
      }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="salon-benevoles.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  }
}
