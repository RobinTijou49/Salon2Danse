import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  // Exportés pour que les autres modules (planning, admin) réutilisent les guards.
  exports: [AuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
