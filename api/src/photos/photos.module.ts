import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // AuthGuard
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService], // réutilisé par le module badges
})
export class PhotosModule {}
