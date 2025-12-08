import { AutoMap } from '@automapper/classes';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';

/**
 * User DTO
 *
 * Response DTO containing user information.
 * Used in authentication responses and user profile queries.
 */
export class UserDto {
  /**
   * User ID (UUID)
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @AutoMap()
  id!: string;

  /**
   * Phone number
   * @example "01837917991"
   */
  @AutoMap()
  phone!: string;

  /**
   * Email address (optional - only for non-lead users)
   * @example "admin@scol.com"
   */
  @AutoMap()
  email?: string;

  /**
   * User type
   * @example "Lead"
   */
  @AutoMap()
  userType!: UserType;

  /**
   * Account status
   * @example "Active"
   */
  @AutoMap()
  accountStatus!: AccountStatus;

  /**
   * Whether phone number is verified
   * @example true
   */
  @AutoMap()
  isPhoneVerified!: boolean;

  /**
   * Full name (from lead profile if available)
   * @example "John Doe"
   */
  @AutoMap()
  fullName?: string;

  /**
   * User roles
   * @example ["Student", "User"]
   */
  @AutoMap()
  roles!: string[];

  /**
   * User permissions
   * @example ["read:profile", "write:profile"]
   */
  @AutoMap()
  permissions!: string[];
}
