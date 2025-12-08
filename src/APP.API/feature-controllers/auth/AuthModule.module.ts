import { Module } from '@nestjs/common';
import { AuthController } from './AuthController.controller';
import { AuthModule as AuthBllModule } from '@bll/services/auth/AuthModule.module';
import { OtpJwtGuard } from '@api/common/guards/OtpJwtGuard.guard';

/**
 * Auth API Module
 *
 * Provides authentication endpoints.
 * Imports AuthModule from BLL for business logic.
 */
@Module({
  imports: [AuthBllModule],
  controllers: [AuthController],
  providers: [OtpJwtGuard],
})
export class AuthModule {}
