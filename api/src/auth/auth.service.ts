import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private hashCode(code: string) {
    // Le code d'invitation n'est jamais stocké en clair (cf. seed).
    return createHash('sha256').update(code.trim()).digest('hex');
  }

  /** Vérifie qu'un code est valide et disponible, sans le consommer. */
  async verifyInvite(code: string) {
    const invite = await this.prisma.invitationCode.findUnique({
      where: { codeHash: this.hashCode(code) },
    });
    const valid = !!invite && invite.status === 'AVAILABLE';
    return { valid, editionId: valid ? invite!.editionId : null };
  }

  /**
   * Inscription. Compte + profil créés ET code consommé dans UNE SEULE
   * transaction. Le code est réclamé de façon atomique (updateMany
   * conditionnel) : deux inscriptions simultanées avec le même code, une
   * seule réussit — pas de double compte au double-clic.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const codeHash = this.hashCode(dto.code);
    const passwordHash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing) {
        throw new ConflictException('Un compte existe déjà avec cet e-mail.');
      }

      // Réclamation atomique du code : passe AVAILABLE -> CONSUMED seulement
      // si personne ne l'a pris entre-temps.
      const claim = await tx.invitationCode.updateMany({
        where: { codeHash, status: 'AVAILABLE' },
        data: { status: 'CONSUMED', consumedAt: new Date() },
      });
      if (claim.count !== 1) {
        throw new ForbiddenException("Code d'invitation invalide ou déjà utilisé.");
      }

      const invite = await tx.invitationCode.findUnique({ where: { codeHash } });

      const user = await tx.user.create({
        data: { email, passwordHash, role: 'VOLUNTEER' },
      });

      const profile = await tx.volunteerProfile.create({
        data: {
          userId: user.id,
          editionId: invite!.editionId,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone.trim(),
        },
      });

      await tx.invitationCode.update({
        where: { id: invite!.id },
        data: { consumedById: profile.id },
      });

      return { id: user.id, email: user.email, role: user.role };
    });
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Message volontairement identique compte inexistant / mauvais mot de
    // passe : évite l'énumération de comptes.
    const invalid = new UnauthorizedException('E-mail ou mot de passe incorrect.');
    if (!user) throw invalid;
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw invalid;
    return { id: user.id, email: user.email, role: user.role };
  }

  async issueTokens(user: { id: string; role: string }) {
    const secret = process.env.JWT_SECRET;
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret, expiresIn: '15m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'refresh' },
      { secret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  /** Vérifie un refresh token et renvoie l'utilisateur associé. */
  async userFromRefresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      if (payload.typ !== 'refresh') throw new Error('mauvais type de token');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new Error('utilisateur introuvable');
      return { id: user.id, role: user.role };
    } catch {
      throw new UnauthorizedException('Session expirée, reconnecte-toi.');
    }
  }

  /** Profil complet de l'utilisateur connecté (pour /auth/me). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile
        ? {
            id: user.profile.id,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            phone: user.profile.phone,
            isMinor: user.profile.isMinor,
            validationStatus: user.profile.validationStatus,
            planningStatus: user.profile.planningStatus,
          }
        : null,
    };
  }
}
