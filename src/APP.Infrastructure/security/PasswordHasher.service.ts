import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IPasswordHasher } from '@shared/interfaces/security';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';

/**
 * Password Hasher Service
 *
 * Provides password hashing and verification using bcrypt.
 * Follows .NET Core's IPasswordHasher pattern.
 *
 * @class PasswordHasher
 * @implements {IPasswordHasher}
 */
@Injectable()
export class PasswordHasher implements IPasswordHasher {
  private readonly SALT_ROUNDS: number;

  constructor(
    @Inject(ISecurityConfigToken) private readonly _config: ISecurityConfig,
  ) {
    this.SALT_ROUNDS = this._config.password.bcryptSaltRounds || 12;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
