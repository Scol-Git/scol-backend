import { Injectable, Inject } from '@nestjs/common';
import { ISmsService } from '@shared/interfaces/services/ISmsService.interface';
import { ILogger } from '@shared/interfaces/logging';
import {
  ILogger as ILoggerToken,
  IInfrastructureConfig as IInfrastructureConfigToken,
} from '@shared/tokens/injection.tokens';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';
import { BusinessException } from '@shared/exceptions/BusinessException';

/**
 * SMS Service
 *
 * Infrastructure service for sending SMS via external provider.
 * Supports two modes:
 * - console: Logs OTP to console (development)
 * - api: Sends SMS via external API (production)
 *
 * Configuration via IInfrastructureConfig.sms
 */
@Injectable()
export class SmsService implements ISmsService {
  private readonly provider: 'console' | 'api';
  private readonly smsApiUrl: string;
  private readonly smsApiKey: string;
  private readonly throwOnFailure: boolean;

  constructor(
    @Inject(IInfrastructureConfigToken)
    private readonly infraConfig: IInfrastructureConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {
    this.provider = this.infraConfig.sms.provider;
    this.smsApiUrl = this.infraConfig.sms.api.url;
    this.smsApiKey = this.infraConfig.sms.api.apiKey;
    this.throwOnFailure = this.infraConfig.sms.api.throwOnFailure;
  }

  /**
   * Send OTP via SMS
   * @param phone Phone number (Bangladesh format: 01XXXXXXXXX)
   * @param otp OTP code
   */
  async sendOtp(phone: string, otp: string): Promise<void> {
    const message = `Your SCOL APP OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;

    if (this.provider === 'console') {
      // Console mode: log OTP
      this.logger.info(
        `[DEV MODE] OTP for ${PhoneNumberUtil.mask(phone)}: ${otp}`,
        {
          context: 'SmsService.sendOtp',
          phone: PhoneNumberUtil.mask(phone),
          action: 'DEV_OTP_SENT',
          provider: 'console',
        },
      );
      return;
    }

    // API mode: send SMS via external provider
    try {
      if (!this.smsApiUrl) {
        throw new Error('SMS API URL is not configured');
      }

      if (!this.smsApiKey) {
        throw new Error('SMS API Key is not configured');
      }

      await this.sendSms(phone, message);
      this.logger.info('OTP SMS sent successfully', {
        context: 'SmsService.sendOtp',
        phone: PhoneNumberUtil.mask(phone),
        action: 'OTP_SMS_SENT',
        provider: 'api',
      });
    } catch (error) {
      this.logger.error('Failed to send OTP SMS', {
        context: 'SmsService.sendOtp',
        phone: PhoneNumberUtil.mask(phone),
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'OTP_SMS_FAILED',
        provider: 'api',
      });

      // Throw in production if configured
      if (this.throwOnFailure) {
        throw new BusinessException(
          'Failed to send verification SMS. Please try again.',
          'SMS_DELIVERY_FAILED',
        );
      }

      // Otherwise, fail silently (user will retry)
    }
  }

  /**
   * Send SMS via external provider
   * @param phone Phone number (format: 8801XXXXXXXXX for API)
   * @param message SMS message
   */
  private async sendSms(phone: string, message: string): Promise<void> {
    // Convert to international format
    const formattedPhone = PhoneNumberUtil.toInternationalFormat(phone);

    const response = await fetch(this.smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.smsApiKey,
        msg: message,
        to: formattedPhone,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS API returned ${response.status}: ${errorText}`);
    }
  }
}
