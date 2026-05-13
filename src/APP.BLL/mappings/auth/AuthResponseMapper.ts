import { Injectable } from '@nestjs/common';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenPair } from '@bll/services/auth/TokenService';
import { UserResponseMapper } from './UserResponseMapper';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';

/**
 * Auth Response Mapper
 *
 * Builds AuthResponseDto from user entity, tokens, optional profile, and academic form status.
 */
@Injectable()
export class AuthResponseMapper {
  constructor(private readonly userMapper: UserResponseMapper) {}

  /**
   * Build AuthResponseDto from user, tokens, optional profile, and academic form status
   * @param user User entity
   * @param tokens Token pair (access + refresh)
   * @param profile Lead profile (optional)
   * @param academicFormStatus Academic form completion status (2-field rule)
   * @returns AuthResponseDto
   */
  toAuthResponse(
    user: SysUsers,
    tokens: TokenPair,
    profile: SysLeadProfiles | undefined,
    academicFormStatus: AcademicFormStatus,
  ): AuthResponseDto {
    const authResponse = new AuthResponseDto();
    authResponse.user = {
      userId: user.id,
      academicFormStatus,
      fullName: profile?.fullName ?? null,
      joinedAt: profile?.createdAt
        ? new Date(profile.createdAt).getFullYear()
        : null,
      imgUrl: profile?.imgUrl ?? null,
    };
    authResponse.accessToken = tokens.accessToken;
    authResponse.refreshToken = tokens.refreshToken;

    return authResponse;
  }
}
