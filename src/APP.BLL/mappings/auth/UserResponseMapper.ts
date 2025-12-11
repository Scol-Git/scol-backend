import { Injectable } from '@nestjs/common';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { UserDto } from '@shared/dtos/auth/UserDto';

@Injectable()
export class UserResponseMapper {
  toUserDto(user: SysUsers, profile?: SysLeadProfiles): UserDto {
    const dto = new UserDto();
    dto.id = user.id;
    dto.phone = user.phone;
    dto.email = user.email;
    dto.userType = user.userType;
    dto.accountStatus = user.accountStatus;
    dto.isPhoneVerified = user.isPhoneVerified;
    dto.roles = user.roles?.map((r: any) => r.name) ?? [];
    dto.permissions = user.permissions?.map((p: any) => p.name) ?? [];
    dto.fullName = profile?.fullName;
    return dto;
  }
}

