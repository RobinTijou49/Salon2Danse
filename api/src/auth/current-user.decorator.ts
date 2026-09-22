import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type AuthUser = { sub: string; role: string };

// Récupère l'utilisateur du token dans un contrôleur : @CurrentUser() user: AuthUser
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user as AuthUser;
  },
);
