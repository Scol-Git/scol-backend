import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  IJwtService,
  IPasswordHasher,
  IRevocationRegistry,
} from '@shared/tokens/injection.tokens';
import { JwtService } from './JwtService.service';
import { PasswordHasher } from './PasswordHasher.service';
import { RevocationRegistry } from './RevocationRegistry.service';
import { TypeOrmModule } from '@infra/db/typeorm/TypeOrmModule.module';
import { RedisModule } from '@infra/redis/RedisModule.module';

/**
 * Security Module - JWT, password hashing, revocation registry.
 */
@Global()
@Module({
  imports: [ConfigModule, TypeOrmModule, RedisModule],
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
      provide: IRevocationRegistry,
      useClass: RevocationRegistry,
    },
  ],
  exports: [IJwtService, IPasswordHasher, IRevocationRegistry],
})
export class SecurityModule {}
