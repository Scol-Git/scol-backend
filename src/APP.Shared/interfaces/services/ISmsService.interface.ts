/**
 * SMS Service Interface
 *
 * Contract for sending SMS messages through external providers.
 * Implementation should handle dev vs prod mode automatically.
 */
export interface ISmsService {
  /**
   * Send OTP via SMS
   * @param phone Phone number (Bangladesh format: 01XXXXXXXXX)
   * @param otp OTP code to send
   * @returns Promise that resolves when SMS is sent (or logged in dev mode)
   */
  sendOtp(phone: string, otp: string): Promise<void>;
}

