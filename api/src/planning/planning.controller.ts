import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { BookDto } from './dto/book.dto';

@ApiTags('planning')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('planning')
export class PlanningController {
  constructor(private readonly planning: PlanningService) {}

  @Get()
  @ApiOperation({ summary: 'Disponibilités (jauges + états) pour le bénévole connecté' })
  availability(@CurrentUser() user: AuthUser) {
    return this.planning.availability(user.sub);
  }

  @Get('me')
  @ApiOperation({ summary: 'Récapitulatif de mes missions' })
  myPlanning(@CurrentUser() user: AuthUser) {
    return this.planning.myPlanning(user.sub);
  }

  @Post('book')
  @ApiOperation({ summary: 'Réserver un créneau (brouillon)' })
  book(@CurrentUser() user: AuthUser, @Body() dto: BookDto) {
    return this.planning.book(user.sub, dto.missionSlotId);
  }

  @Delete('book/:bookingId')
  @ApiOperation({ summary: 'Annuler une réservation en brouillon' })
  unbook(@CurrentUser() user: AuthUser, @Param('bookingId') bookingId: string) {
    return this.planning.unbook(user.sub, bookingId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Valider définitivement mon planning (verrouillage)' })
  validate(@CurrentUser() user: AuthUser) {
    return this.planning.validate(user.sub);
  }
}
