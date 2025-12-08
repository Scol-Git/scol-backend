import { Injectable } from '@nestjs/common';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenPair } from '@bll/services/auth/TokenService';
import { UserResponseMapper } from './UserResponseMapper';

/**
 * Auth Response Mapper
 *
 * Builds AuthResponseDto from user entity, tokens, and optional profile.
 */
@Injectable()
export class AuthResponseMapper {
  constructor(private readonly userMapper: UserResponseMapper) {}

  /**
   * Build AuthResponseDto from user, tokens, and optional profile
   * @param user User entity
   * @param tokens Token pair (access + refresh)
   * @param profile Lead profile (optional)
   * @returns AuthResponseDto
   */
  toAuthResponse(
    user: SysUsers,
    tokens: TokenPair,
    profile?: SysLeadProfiles,
  ): AuthResponseDto {
    const authResponse = new AuthResponseDto();
    authResponse.userId = user.id;
    authResponse.accessToken = tokens.accessToken;
    authResponse.refreshToken = tokens.refreshToken;
    authResponse.expiresIn = tokens.expiresIn;

    return authResponse;
  }
}
