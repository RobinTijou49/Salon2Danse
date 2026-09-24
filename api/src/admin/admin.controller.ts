import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

function baseUrlOf(req: Request) {
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || req.protocol;
  return `${proto}://${req.get('host')}`;
}
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

  @Post('editions/:id/invite')
  @ApiOperation({ summary: 'Inviter un bénévole par e-mail (code nominatif + envoi)' })
  invite(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Body() dto: { email: string },
    @Req() req: Request,
  ) {
    if (!dto?.email) throw new BadRequestException('E-mail requis.');
    return this.admin.inviteByEmail(u.sub, id, dto.email, baseUrlOf(req));
  }

  @Post('editions/:id/invite-csv')
  @ApiOperation({ summary: 'Importer un CSV de bénévoles (un code + mail par e-mail)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  inviteCsv(
    @CurrentUser() u: AuthUser,
    @Param('id') id: string,
    @Req() req: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.admin.inviteByCsv(u.sub, id, file.buffer, baseUrlOf(req));
  }

  @Get('editions/:id/codes/export.csv')
  @ApiOperation({ summary: "Exporter tous les codes d'une édition (CSV)" })
  exportCodes(@Param('id') id: string, @Res() res: Response) {
    return this.admin.exportCodesCsv(id, res);
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

  // ---- Créneaux (CRUD) ----
  @Get('slots')
  @ApiOperation({ summary: 'Lister les créneaux réservables' })
  listSlots(@Query('editionId') editionId?: string) {
    return this.admin.listSlots(editionId);
  }

  @Get('slots/meta')
  @ApiOperation({ summary: 'Missions et créneaux horaires (pour créer un créneau)' })
  slotsMeta(@Query('editionId') editionId?: string) {
    return this.admin.slotsMeta(editionId);
  }

  @Post('slots')
  @ApiOperation({ summary: 'Créer un créneau réservable' })
  createSlot(
    @CurrentUser() u: AuthUser,
    @Body() dto: { missionId: string; timeSlotId: string; capacity?: number },
  ) {
    return this.admin.createSlot(u.sub, dto);
  }

  @Patch('slots/:id')
  @ApiOperation({ summary: 'Modifier la capacité (jauge) d’un créneau' })
  updateSlot(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: { capacity: number }) {
    return this.admin.updateSlotCapacity(u.sub, id, dto.capacity);
  }

  @Delete('slots/:id')
  @ApiOperation({ summary: 'Supprimer un créneau (si aucune réservation)' })
  deleteSlot(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.deleteSlot(u.sub, id);
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
    @Query('minor') minor?: string,
    @Query('page') page?: string,
  ) {
    return this.admin.volunteers({
      search, status, planning, dayId, missionId, editionId, minor, page: Number(page),
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

  @Post('volunteers/:id/reject')
  @ApiOperation({ summary: 'Refuser un profil (mineur non conforme)' })
  reject(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.admin.rejectProfile(u.sub, id);
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
