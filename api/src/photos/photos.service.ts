import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Response } from 'express';
import { Readable } from 'stream';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PhotosService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService) {
    this.bucket = process.env.S3_BUCKET || 'photos';
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      forcePathStyle: true, // requis pour MinIO
    });
  }

  async onModuleInit() {
    // Crée le bucket au démarrage s'il n'existe pas encore.
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (e) {
        // Le stockage n'est pas prêt : on ne bloque pas le démarrage de l'API.
        console.warn('Bucket photos indisponible au démarrage :', (e as Error).message);
      }
    }
  }

  /**
   * Valide et normalise une photo, puis la stocke.
   * sharp re-encode l'image : un fichier non-image (ex. .php renommé .jpg)
   * échoue au décodage — c'est notre garantie de type réel.
   */
  async upload(userId: string, buffer: Buffer, mimetype: string) {
    const profile = await this.prisma.volunteerProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Profil bénévole requis.');
    if (!mimetype?.startsWith('image/')) {
      throw new BadRequestException('Le fichier doit être une image.');
    }

    let out: Buffer;
    try {
      out = await sharp(buffer)
        .rotate() // corrige l'orientation EXIF (photos de téléphone)
        .resize(600, 600, { fit: 'cover' }) // carré pour le badge
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Image illisible ou corrompue.');
    }

    const key = `profiles/${profile.id}.jpg`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: out,
        ContentType: 'image/jpeg',
      }),
    );
    await this.prisma.volunteerProfile.update({
      where: { id: profile.id },
      data: { photoKey: key },
    });
    return { ok: true };
  }

  /** Téléverse l'autorisation parentale d'un bénévole mineur (PDF ou image). */
  async uploadParentalConsent(userId: string, buffer: Buffer, mimetype: string) {
    const profile = await this.prisma.volunteerProfile.findUnique({ where: { userId } });
    if (!profile) throw new ForbiddenException('Profil bénévole requis.');
    if (!profile.isMinor) {
      throw new BadRequestException('Réservé aux profils mineurs.');
    }
    const ext: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
    };
    if (!ext[mimetype]) {
      throw new BadRequestException('Format accepté : PDF, JPEG ou PNG.');
    }
    const key = `parental/${profile.id}.${ext[mimetype]}`;
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimetype }),
    );
    await this.prisma.volunteerProfile.update({
      where: { id: profile.id },
      data: { parentalConsentKey: key },
    });
    return { ok: true };
  }

  /** Diffuse l'autorisation parentale d'un bénévole (consultation admin). */
  async streamParentalConsent(profileId: string, res: Response) {
    const profile = await this.prisma.volunteerProfile.findUnique({ where: { id: profileId } });
    if (!profile?.parentalConsentKey) throw new NotFoundException('Aucune autorisation fournie.');
    const type = profile.parentalConsentKey.endsWith('.pdf')
      ? 'application/pdf'
      : profile.parentalConsentKey.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
    const obj = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: profile.parentalConsentKey }),
    );
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', 'inline; filename="autorisation-parentale"');
    (obj.Body as Readable).pipe(res);
  }

  /** Récupère l'objet stocké sous une clé (pour le badge). */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const obj = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await (obj.Body as any).transformToByteArray());
  }

  /** Diffuse la photo du bénévole connecté. */
  async streamOwn(userId: string, res: Response) {
    const profile = await this.prisma.volunteerProfile.findUnique({ where: { userId } });
    if (!profile?.photoKey) throw new NotFoundException('Aucune photo enregistrée.');
    const obj = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: profile.photoKey }),
    );
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=60');
    (obj.Body as Readable).pipe(res);
  }
}
