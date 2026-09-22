import { Module } from '@nestjs/common';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { AuthModule } from '../auth/auth.module';
import { PhotosModule } from '../photos/photos.module';

@Module({
  imports: [AuthModule, PhotosModule], // guards + JwtService + PhotosService
  controllers: [BadgesController],
  providers: [BadgesService],
})
export class BadgesModule {}
