import { Injectable, Inject } from '@nestjs/common';
import { Mapper } from '@automapper/core';
import { IMapper } from '@shared/tokens/injection.tokens';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { UserDto } from '@shared/dtos/auth/UserDto';

/**
 * User Response Mapper
 *
 * Maps SysUsers entity (with optional LeadProfile) to UserDto.
 * Uses AutoMapper for type-safe mapping.
 */
@Injectable()
export class UserResponseMapper {
  constructor(@Inject(IMapper) private readonly _mapper: Mapper) {
    this._configureMapping();
  }

  /**
   * Configure AutoMapper mappings
   */
  private _configureMapping(): void {
    // Mapping configuration is handled by AutoMapper decorators
    // No explicit mapping needed as we're using @AutoMap() decorators
  }

  /**
   * Map SysUsers entity to UserDto
   * @param user User entity
   * @param profile Lead profile (optional)
   * @returns UserDto
   */
  toUserDto(user: SysUsers, profile?: SysLeadProfiles): UserDto {
    // Manual mapping since AutoMapper's createMap is not available in this version
    const userDto = new UserDto();
    userDto.id = user.id;
    userDto.phone = user.phone;
    userDto.email = user.email;
    userDto.userType = user.userType;
    userDto.accountStatus = user.accountStatus;
    userDto.isPhoneVerified = user.isPhoneVerified;
    userDto.roles = user.roles?.map((role: any) => role.name) || [];
    userDto.permissions = user.permissions?.map((perm: any) => perm.name) || [];
    userDto.fullName = profile?.fullName;

    return userDto;
  }
}
