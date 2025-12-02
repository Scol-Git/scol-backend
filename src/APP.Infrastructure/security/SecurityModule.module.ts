import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IJwtService, IPasswordHasher, IFirebaseService } from '@shared/tokens/injection.tokens';
import { JwtService } from './JwtService.service';
import { PasswordHasher } from './PasswordHasher.service';
import { FirebaseService } from './FirebaseService.service';

/**
 * Security Module
 *
 * Provides security services: JWT token generation/validation and password hashing.
 *
 * @module SecurityModule
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: IJwtService,
      useClass: JwtService,
    },
    {
      provide: IPasswordHasher,
      useClass: PasswordHasher,
    },
    {
      provide: IFirebaseService,
      useClass: FirebaseService,
    },
  ],
  exports: [IJwtService, IPasswordHasher, IFirebaseService],
})
export class SecurityModule {}
