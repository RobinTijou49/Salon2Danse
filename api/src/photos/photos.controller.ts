import {
  BadRequestException,
  Controller,
  Get,
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
}
