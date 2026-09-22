import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // fournit AuthGuard + JwtModule
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
