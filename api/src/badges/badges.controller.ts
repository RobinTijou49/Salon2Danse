import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BadgesService } from './badges.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

function baseUrlOf(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol;
  return `${proto}://${req.get('host')}`;
}

@ApiTags('badges')
@Controller('badges')
export class BadgesController {
  constructor(private readonly badges: BadgesService) {}

  @Get('volunteer/:profileId')
  @ApiCookieAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: "Badge PDF d'un bénévole (admin)" })
  volunteerBadge(@Param('profileId') profileId: string, @Req() req: Request, @Res() res: Response) {
    return this.badges.renderBadge({ id: profileId }, baseUrlOf(req), res);
  }

  @Get('sheet')
  @ApiCookieAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Planche A4 de tous les badges (admin)' })
  sheet(@Query('editionId') editionId: string | undefined, @Req() req: Request, @Res() res: Response) {
    return this.badges.renderSheet(editionId, baseUrlOf(req), res);
  }

  // --- Vérification publique (scan du QR) ---
  @Get('verify/:token')
  @ApiOperation({ summary: 'Vérifier un badge (public, via le QR)' })
  verify(@Param('token') token: string) {
    return this.badges.verify(token);
  }

  @Get('verify/:token/photo')
  @ApiOperation({ summary: 'Photo liée à un badge vérifié (public)' })
  verifyPhoto(@Param('token') token: string, @Res() res: Response) {
    return this.badges.verifyPhoto(token, res);
  }
}
