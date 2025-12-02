import { RegisterRequestDto } from '@shared/dtos/auth/RegisterRequestDto.dto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto.dto';
import { RefreshTokenRequestDto } from '@shared/dtos/auth/RefreshTokenRequestDto.dto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto.dto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto.dto';
import { FirebaseLoginRequestDto } from '@shared/dtos/auth/FirebaseLoginRequestDto.dto';
import { FirebaseVerifyPhoneRequestDto } from '@shared/dtos/auth/FirebaseVerifyPhoneRequestDto.dto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto.dto';

/**
 * Interface for Authentication Service.
 * 
 * Defines the contract for authentication and authorization operations.
 * Follows .NET Core's approach of programming to interfaces, not implementations.
 * 
 * @interface IAuthService
 * 
 * @example
 * ```typescript
 * // Register a new user
 * const response = await authService.register(registerDto, orgId);
 * 
 * // Login
 * const response = await authService.login(loginDto, orgId);
 * 
 * // Refresh token
 * const response = await authService.refreshToken(refreshTokenDto);
 * ```
 */
export interface IAuthService {
  /**
   * Register a new user with email and password.
   * 
   * @param dto - Registration data (email, password)
   * @param orgId - Organization ID the user belongs to
   * @returns Authentication response with tokens and user info
   * @throws ConflictException if user already exists
   * @throws NotFoundException if organization not found
   */
  register(
    dto: RegisterRequestDto,
    orgId: string,
  ): Promise<AuthResponseDto>;

  /**
   * Login with email and password.
   * 
   * @param dto - Login credentials (email, password)
   * @param orgId - Organization ID
   * @returns Authentication response with tokens and user info
   * @throws UnauthorizedException if credentials are invalid
   * @throws AccountLockedException if account is locked
   */
  login(dto: LoginRequestDto, orgId: string): Promise<AuthResponseDto>;

  /**
   * Refresh access token using refresh token.
   * 
   * @param dto - Refresh token request
   * @returns New authentication response with fresh tokens
   * @throws UnauthorizedException if refresh token is invalid or expired
   */
  refreshToken(dto: RefreshTokenRequestDto): Promise<AuthResponseDto>;

  /**
   * Request password reset.
   * Generates a password reset token and sends it via email.
   * 
   * @param dto - Forgot password request (email)
   * @param orgId - Organization ID
   * @returns Promise that resolves when email is sent (or silently fails if user doesn't exist)
   */
  forgotPassword(
    dto: ForgotPasswordRequestDto,
    orgId: string,
  ): Promise<void>;

  /**
   * Reset password using reset token.
   * 
   * @param dto - Reset password request (token, newPassword)
   * @param orgId - Organization ID
   * @returns Promise that resolves when password is reset
   * @throws UnauthorizedException if token is invalid or expired
   */
  resetPassword(
    dto: ResetPasswordRequestDto,
    orgId: string,
  ): Promise<void>;

  /**
   * Login with Firebase ID token (Google authentication).
   * Verifies the Firebase ID token, creates/updates user in DB, and issues app tokens.
   * 
   * @param dto - Firebase login request (idToken)
   * @param orgId - Organization ID (optional - if not provided, uses user's existing org or creates personal org)
   * @returns Authentication response with tokens and user info
   * @throws UnauthorizedException if Firebase token is invalid
   * @throws NotFoundException if organization not found (when orgId is provided)
   */
  loginWithFirebase(
    dto: FirebaseLoginRequestDto,
    orgId?: string,
  ): Promise<AuthResponseDto>;

  /**
   * Verify phone number with Firebase ID token.
   * Verifies the Firebase ID token (which includes phone_number after OTP verification),
   * and updates the user's phone and phoneVerified status.
   * 
   * @param dto - Firebase verify phone request (idToken)
   * @returns Promise that resolves when phone is verified
   * @throws UnauthorizedException if Firebase token is invalid
   * @throws NotFoundException if user not found
   */
  verifyPhoneWithFirebase(
    dto: FirebaseVerifyPhoneRequestDto,
  ): Promise<{ message: string }>;
}

