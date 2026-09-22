import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

// Au fur et à mesure, ajouter ici les modules métier :
//   AuthModule, InvitationsModule, PlanningModule, BookingsModule,
//   AdminModule, ExportsModule, BadgesModule
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
