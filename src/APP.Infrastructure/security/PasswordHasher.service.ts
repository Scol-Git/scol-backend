import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IPasswordHasher } from '@shared/interfaces/security';

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
  private readonly SALT_ROUNDS = 12; // Industry standard for bcrypt

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}



