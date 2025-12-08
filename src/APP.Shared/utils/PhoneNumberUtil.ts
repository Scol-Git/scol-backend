import { ValidationException } from '@shared/exceptions/ValidationException';

/**
 * Phone Number Utility
 *
 * Provides utility methods for Bangladesh phone number validation,
 * formatting, and masking.
 */
export class PhoneNumberUtil {
  /**
   * Bangladesh phone number regex pattern
   * Format: 01XXXXXXXXX (11 digits starting with 01)
   */
  static readonly BD_PHONE_REGEX = /^01[0-9]{9}$/;

  /**
   * Check if phone number is valid Bangladesh format
   * @param phone Phone number to validate
   * @returns true if valid, false otherwise
   */
  static isValid(phone: string): boolean {
    if (!phone) return false;
    return this.BD_PHONE_REGEX.test(phone);
  }

  /**
   * Validate phone number and throw exception if invalid
   * @param phone Phone number to validate
   * @throws ValidationException if phone number is invalid
   */
  static validate(phone: string): void {
    if (!this.isValid(phone)) {
      throw new ValidationException(
        'Phone must be a valid 11-digit Bangladesh number starting with 01',
      );
    }
  }

  /**
   * Convert Bangladesh phone to international format
   * @param phone Phone number in local format (01XXXXXXXXX)
   * @returns Phone number in international format (8801XXXXXXXXX)
   * @example
   * PhoneNumberUtil.toInternationalFormat('01837917991') // Returns '8801837917991'
   */
  static toInternationalFormat(phone: string): string {
    if (!phone) return phone;
    return phone.startsWith('01') ? `88${phone}` : phone;
  }

  /**
   * Mask phone number for logging/display (security)
   * @param phone Phone number to mask
   * @returns Masked phone number
   * @example
   * PhoneNumberUtil.mask('01837917991') // Returns '01837***991'
   */
  static mask(phone: string): string {
    if (!phone || phone.length < 8) return '***';
    return phone.slice(0, 5) + '***' + phone.slice(-3);
  }

  /**
   * Mask email for logging/display (security)
   * @param email Email to mask
   * @returns Masked email
   * @example
   * PhoneNumberUtil.maskEmail('user@example.com') // Returns 'u***@e***.com'
   */
  static maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '***';
    const maskedDomain = domain.charAt(0) + '***' + domain.slice(-4);
    return `${maskedLocal}@${maskedDomain}`;
  }

  /**
   * Mask identifier (email or phone) based on type
   * @param identifier Email or phone number
   * @returns Masked identifier
   */
  static maskIdentifier(identifier: string): string {
    if (!identifier) return '***';
    if (identifier.includes('@')) {
      return this.maskEmail(identifier);
    }
    return this.mask(identifier);
  }
}
