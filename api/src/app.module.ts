import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PlanningModule } from './planning/planning.module';
import { PhotosModule } from './photos/photos.module';
import { BadgesModule } from './badges/badges.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    PlanningModule,
    PhotosModule,
    BadgesModule,
    AdminModule,
  ],
})
export class AppModule {}
