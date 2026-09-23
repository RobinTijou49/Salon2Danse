import { Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { PhotosService } from '../photos/photos.service';

const BRAND = '#7A291E';
const INK = '#2A2724';
const MUTED = '#6B6560';

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photos: PhotosService,
    private readonly jwt: JwtService,
  ) {}

  private secret() {
    return process.env.QR_SIGNING_SECRET || 'change-me';
  }

  /** Jeton signé encodé dans le QR — garantit qu'un badge n'est pas falsifiable. */
  private signBadge(profileId: string) {
    return this.jwt.signAsync({ sub: profileId, typ: 'badge' }, { secret: this.secret() });
  }

  private async loadProfile(where: { id?: string; userId?: string }) {
    const profile = await this.prisma.volunteerProfile.findFirst({ where });
    if (!profile) throw new NotFoundException('Bénévole introuvable.');
    return profile;
  }

  /** Génère le badge PDF d'un bénévole et le diffuse dans la réponse. */
  async renderBadge(where: { id?: string; userId?: string }, baseUrl: string, res: Response) {
    const profile = await this.loadProfile(where);
    const token = await this.signBadge(profile.id);
    const verifyUrl = `${baseUrl}/verify/${token}`;

    const qrBuf = await QRCode.toBuffer(verifyUrl, { margin: 1, width: 300 });
    let photoBuf: Buffer | null = null;
    if (profile.photoKey) {
      try {
        photoBuf = await this.photos.getObjectBuffer(profile.photoKey);
      } catch {
        photoBuf = null;
      }
    }

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="badge-${profile.lastName}.pdf"`);
    doc.pipe(res);

    // Badge centré sur A4 (facile à imprimer et découper)
    const W = 260;
    const H = 380;
    const x = (595.28 - W) / 2;
    const y = (841.89 - H) / 2;
    this.drawBadge(doc, x, y, W, H, profile, photoBuf, qrBuf);

    doc.end();
  }

  private drawBadge(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    w: number,
    h: number,
    profile: { id: string; firstName: string; lastName: string },
    photoBuf: Buffer | null,
    qrBuf: Buffer,
  ) {
    // Cadre
    doc.roundedRect(x, y, w, h, 14).lineWidth(1).stroke('#EAE3DF');

    // Bandeau marque
    const headH = 74;
    doc.save();
    doc.roundedRect(x, y, w, headH + 14, 14).clip();
    doc.rect(x, y, w, headH).fill(BRAND);
    doc.restore();
    doc
      .fillColor('white')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('SALON DE LA DANSE', x, y + 20, { width: w, align: 'center' });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor('#F7D9D0')
      .text('ANGERS · 14–16 MAI 2027', x, y + 42, {
        width: w,
        align: 'center',
        characterSpacing: 1,
      });

    // Photo carrée
    const ps = 128;
    const px = x + (w - ps) / 2;
    const py = y + headH + 18;
    doc.roundedRect(px, py, ps, ps, 10).lineWidth(2).stroke(BRAND);
    if (photoBuf) {
      doc.save();
      doc.roundedRect(px, py, ps, ps, 10).clip();
      doc.image(photoBuf, px, py, { width: ps, height: ps });
      doc.restore();
    } else {
      doc.fontSize(9).fillColor(MUTED).text('Sans photo', px, py + ps / 2 - 5, {
        width: ps,
        align: 'center',
      });
    }

    // Nom
    const name = `${profile.firstName} ${profile.lastName.toUpperCase()}`;
    doc
      .fillColor(INK)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text(name, x + 10, py + ps + 16, { width: w - 20, align: 'center' });

    // Rôle
    const pillW = 96;
    const pillX = x + (w - pillW) / 2;
    const pillY = py + ps + 44;
    doc.roundedRect(pillX, pillY, pillW, 22, 11).fill(BRAND);
    doc
      .fillColor('white')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('BÉNÉVOLE', pillX, pillY + 6.5, { width: pillW, align: 'center', characterSpacing: 1 });

    // ID unique
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(8)
      .text(`ID ${profile.id.slice(-8).toUpperCase()}`, x, pillY + 30, {
        width: w,
        align: 'center',
      });

    // QR de vérification
    const qs = 92;
    const qx = x + (w - qs) / 2;
    const qy = y + h - qs - 26;
    doc.image(qrBuf, qx, qy, { width: qs, height: qs });
    doc
      .fillColor(MUTED)
      .fontSize(7.5)
      .text('Scanner pour vérifier', x, qy + qs + 4, { width: w, align: 'center' });
  }

  /** Planche A4 de tous les badges d'une édition (impression en lot). */
  async renderSheet(editionIdParam: string | undefined, baseUrl: string, res: Response) {
    const editionId =
      editionIdParam ??
      (
        await this.prisma.edition.findFirst({
          orderBy: [{ isArchived: 'asc' }, { startDate: 'desc' }],
        })
      )?.id;
    const profiles = await this.prisma.volunteerProfile.findMany({
      where: { editionId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="planche-badges.pdf"');
    doc.pipe(res);

    const W = 250;
    const H = 368;
    const cols = 2;
    const rows = 2;
    const perPage = cols * rows;
    const mx = (595.28 - cols * W) / (cols + 1);
    const my = (841.89 - rows * H) / (rows + 1);

    if (profiles.length === 0) {
      doc.fontSize(14).fillColor(MUTED).text('Aucun bénévole pour cette édition.', 0, 400, {
        width: 595,
        align: 'center',
      });
      doc.end();
      return;
    }

    let i = 0;
    for (const p of profiles) {
      const pos = i % perPage;
      if (i > 0 && pos === 0) doc.addPage();
      const c = pos % cols;
      const r = Math.floor(pos / cols);
      const x = mx + c * (W + mx);
      const y = my + r * (H + my);

      const token = await this.signBadge(p.id);
      const qrBuf = await QRCode.toBuffer(`${baseUrl}/verify/${token}`, { margin: 1, width: 300 });
      let photoBuf: Buffer | null = null;
      if (p.photoKey) {
        try {
          photoBuf = await this.photos.getObjectBuffer(p.photoKey);
        } catch {
          photoBuf = null;
        }
      }
      this.drawBadge(doc, x, y, W, H, p, photoBuf, qrBuf);
      i++;
    }
    doc.end();
  }

  /** Vérifie un jeton de QR et renvoie les infos affichables à l'entrée. */
  async verify(token: string) {
    let profileId: string;
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: this.secret() });
      if (payload.typ !== 'badge') throw new Error('type invalide');
      profileId = payload.sub;
    } catch {
      return { valid: false as const };
    }

    const profile = await this.prisma.volunteerProfile.findUnique({
      where: { id: profileId },
      include: {
        bookings: {
          include: { missionSlot: { include: { mission: true } }, timeSlot: { include: { day: true } } },
        },
      },
    });
    if (!profile) return { valid: false as const };

    const missions = profile.bookings
      .map((b) => ({
        day: b.timeSlot.day.label,
        date: b.timeSlot.day.date,
        indexInDay: b.timeSlot.indexInDay,
        startTime: b.timeSlot.startTime,
        endTime: b.timeSlot.endTime,
        mission: b.missionSlot.mission.name,
      }))
      .sort((a, b) => (a.date === b.date ? a.indexInDay - b.indexInDay : a.date < b.date ? -1 : 1));

    return {
      valid: true as const,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: 'BÉNÉVOLE',
      hasPhoto: !!profile.photoKey,
      planningValidated: profile.planningStatus === 'VALIDATED',
      missions,
    };
  }

  /** Diffuse la photo liée à un jeton de QR (page de vérification publique). */
  async verifyPhoto(token: string, res: Response) {
    let profileId: string;
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: this.secret() });
      if (payload.typ !== 'badge') throw new Error('type invalide');
      profileId = payload.sub;
    } catch {
      throw new NotFoundException();
    }
    const profile = await this.prisma.volunteerProfile.findUnique({ where: { id: profileId } });
    if (!profile?.photoKey) throw new NotFoundException('Aucune photo.');
    const buf = await this.photos.getObjectBuffer(profile.photoKey);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.end(buf);
  }
}
