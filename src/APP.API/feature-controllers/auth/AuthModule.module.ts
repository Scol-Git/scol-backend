import { Module } from '@nestjs/common';
import { AuthController } from './AuthController.controller';
import { AuthV2Controller } from './AuthV2Controller.controller';
import { AuthModule as AuthBllModule } from '@bll/services/auth/AuthModule.module';
import { OtpJwtGuard } from '@api/common/guards/OtpJwtGuard.guard';
import { OtpJwtBodyGuard } from '@api/common/guards/OtpJwtBodyGuard.guard';

/**
 * Auth API Module
 *
 * Provides authentication endpoints.
 * Imports AuthModule from BLL for business logic.
 */
@Module({
  imports: [AuthBllModule],
  controllers: [AuthController, AuthV2Controller],
  providers: [OtpJwtGuard, OtpJwtBodyGuard],
})
export class AuthModule {}
