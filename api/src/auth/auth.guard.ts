import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// Injecte req.user = { sub, role } à partir du cookie access_token.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.['access_token'];
    if (!token) throw new UnauthorizedException('Non authentifié.');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(token, {
        secret: process.env.JWT_SECRET,
      });
      req.user = payload;
    } catch {
      throw new UnauthorizedException('Session invalide ou expirée.');
    }
    return true;
  }
}
