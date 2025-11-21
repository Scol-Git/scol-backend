import { Module } from '@nestjs/common';
import { AuthController } from './AuthController.controller';
import { AuthService } from '@bll/services/AuthService.service';
import { IAuthService } from '@shared/tokens/injection.tokens';

/**
 * Auth Feature Module
 *
 * Registers authentication-related controllers and services.
 * Guards are registered in ApiModule (common/guards) and available globally.
 * No imports needed - uses @Global modules (ILogger, IJwtService, IPasswordHasher, DbContext).
 */
@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: IAuthService,
      useClass: AuthService,
    },
  ],
})
export class AuthModule {}
