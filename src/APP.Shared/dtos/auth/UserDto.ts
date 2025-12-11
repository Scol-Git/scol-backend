import { AutoMap } from '@automapper/classes';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';

/**
 * User DTO
 */
export class UserDto {
  @AutoMap()
  id!: string;

  @AutoMap()
  phone!: string;

  @AutoMap()
  email?: string;

  @AutoMap()
  userType!: UserType;

  @AutoMap()
  accountStatus!: AccountStatus;

  @AutoMap()
  isPhoneVerified!: boolean;

  @AutoMap()
  fullName?: string;

  @AutoMap()
  roles!: string[];

  @AutoMap()
  permissions!: string[];
}

