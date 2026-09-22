import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PlanningModule } from './planning/planning.module';
import { PhotosModule } from './photos/photos.module';
import { BadgesModule } from './badges/badges.module';

// Au fur et à mesure, ajouter ici les modules métier :
//   AdminModule, ExportsModule
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PlanningModule,
    PhotosModule,
    BadgesModule,
  ],
})
export class AppModule {}
