import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PhotosService } from './photos.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';

@ApiTags('photos')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post('me')
  @ApiOperation({ summary: 'Envoyer ma photo (obligatoire pour le badge)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.photos.upload(user.sub, file.buffer, file.mimetype);
  }

  @Get('me')
  @ApiOperation({ summary: 'Récupérer ma photo' })
  myPhoto(@CurrentUser() user: AuthUser, @Res() res: Response) {
    return this.photos.streamOwn(user.sub, res);
  }

  @Post('parental-consent')
  @ApiOperation({ summary: 'Envoyer mon autorisation parentale (mineur)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { document: { type: 'string', format: 'binary' } } },
  })
  @UseInterceptors(FileInterceptor('document', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadConsent(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.photos.uploadParentalConsent(user.sub, file.buffer, file.mimetype);
  }

  @Get('parental-consent/:profileId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: "Consulter l'autorisation parentale d'un bénévole (admin)" })
  consent(@Param('profileId') profileId: string, @Res() res: Response) {
    return this.photos.streamParentalConsent(profileId, res);
  }
}
