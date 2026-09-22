import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { VerifyInviteDto } from './dto/verify-invite.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser, AuthUser } from './current-user.decorator';

const COMMON = {
  httpOnly: true,
  sameSite: 'lax' as const,
  // Passe à true dès que le site est servi en HTTPS (DOMAIN = un vrai domaine).
  secure: process.env.COOKIE_SECURE === 'true',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie('access_token', tokens.accessToken, {
      ...COMMON,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 min
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COMMON,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });
  }

  @Post('verify-invite')
  @HttpCode(200)
  @ApiOperation({ summary: "Vérifie un code d'invitation sans le consommer" })
  verifyInvite(@Body() dto: VerifyInviteDto) {
    return this.auth.verifyInvite(dto.code);
  }

  @Post('register')
  @ApiOperation({ summary: 'Inscription (consomme le code) et connecte le bénévole' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto);
    this.setAuthCookies(res, await this.auth.issueTokens(user));
    return user;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion par e-mail / mot de passe' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto);
    this.setAuthCookies(res, await this.auth.issueTokens(user));
    return user;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renouvelle le token via le cookie refresh' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException('Aucune session à renouveler.');
    const user = await this.auth.userFromRefresh(token);
    this.setAuthCookies(res, await this.auth.issueTokens(user));
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Déconnexion (efface les cookies)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }
}
