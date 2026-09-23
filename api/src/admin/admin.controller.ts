import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { AssignDto, UpdateIdentityDto } from './dto';

@ApiTags('admin')
@ApiCookieAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Compteurs du tableau de bord' })
  stats(@Query('editionId') editionId?: string) {
    return this.admin.stats(editionId);
  }

  // ---- Éditions ----
  @Get('editions')
  @ApiOperation({ summary: 'Liste des éditions' })
  editions() {
    return this.admin.editions();
  }

  @Post('editions')
  @ApiOperation({ summary: 'Créer une édition (structure + codes)' })
  createEdition(@CurrentUser() u: AuthUser, @Body() dto: { name: string; startDate: string }) {
    return this.admin.createEdition(u.sub, dto);
  }

  @Post('editions/:id/archive')
  @ApiOperation({ summary: 'Archiver une édition (lecture seule)' })
  archive(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.setArchived(u.sub, id, true);
  }

  @Post('editions/:id/unarchive')
  @ApiOperation({ summary: 'Désarchiver une édition' })
  unarchive(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.setArchived(u.sub, id, false);
  }

  @Post('editions/:id/codes')
  @ApiOperation({ summary: "Générer des codes d'invitation en lot (clair renvoyé une fois)" })
  generateCodes(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: { count: number }) {
    return this.admin.generateCodes(u.sub, id, dto.count);
  }

  @Get('editions/:id/codes/stats')
  @ApiOperation({ summary: "Suivi d'utilisation des codes d'une édition" })
  codeStats(@Param('id') id: string) {
    return this.admin.codeStats(id);
  }

  @Post('emails/reminders')
  @ApiOperation({ summary: 'Envoyer les rappels J-3 (plannings validés)' })
  reminders(@CurrentUser() u: AuthUser, @Query('editionId') editionId?: string) {
    return this.admin.sendReminders(u.sub, editionId);
  }

  @Get('meta')
  @ApiOperation({ summary: 'Jours et missions (pour les filtres)' })
  meta() {
    return this.admin.meta();
  }

  @Get('volunteers')
  @ApiOperation({ summary: 'Recherche multi-critères des bénévoles' })
  volunteers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('planning') planning?: string,
    @Query('dayId') dayId?: string,
    @Query('missionId') missionId?: string,
    @Query('editionId') editionId?: string,
    @Query('page') page?: string,
  ) {
    return this.admin.volunteers({
      search, status, planning, dayId, missionId, editionId, page: Number(page),
    });
  }

  @Get('volunteers/:id')
  @ApiOperation({ summary: 'Fiche détaillée d’un bénévole' })
  detail(@Param('id') id: string) {
    return this.admin.volunteerDetail(id);
  }

  @Patch('volunteers/:id')
  @ApiOperation({ summary: 'Modifier l’identité (outrepassement admin)' })
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateIdentityDto) {
    return this.admin.updateIdentity(u.sub, id, dto);
  }

  @Post('volunteers/:id/validate')
  @ApiOperation({ summary: 'Valider un profil (mineur inclus)' })
  validate(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.validateProfile(u.sub, id);
  }

  @Post('volunteers/:id/unlock')
  @ApiOperation({ summary: 'Déverrouiller un planning validé' })
  unlock(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.unlockPlanning(u.sub, id);
  }

  @Post('volunteers/:id/reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe (retourne un provisoire)' })
  reset(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.resetPassword(u.sub, id);
  }

  @Post('volunteers/:id/assign')
  @ApiOperation({ summary: 'Attribuer un poste (sensibles inclus)' })
  assign(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: AssignDto) {
    return this.admin.assign(u.sub, id, dto.missionSlotId);
  }

  @Delete('bookings/:bookingId')
  @ApiOperation({ summary: 'Retirer une réservation' })
  removeBooking(@CurrentUser() u: AuthUser, @Param('bookingId') bookingId: string) {
    return this.admin.removeBooking(u.sub, bookingId);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Journal d’audit des actions admin' })
  audit() {
    return this.admin.auditLog();
  }

  // ---- Exports ----
  @Get('export/volunteers.csv')
  exportVolunteersCsv(@Res() res: Response) {
    return this.admin.exportVolunteersCsv(res);
  }

  @Get('export/planning.csv')
  exportPlanningCsv(@Res() res: Response) {
    return this.admin.exportPlanningCsv(res);
  }

  @Get('export/salon.xlsx')
  exportXlsx(@Res() res: Response) {
    return this.admin.exportXlsx(res);
  }
}
