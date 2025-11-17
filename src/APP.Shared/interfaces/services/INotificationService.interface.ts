import { SendEmailRequestDto } from '@shared/dtos/notifications/SendEmailRequestDto.dto';
import { SendTemplatedEmailRequestDto } from '@shared/dtos/notifications/SendTemplatedEmailRequestDto.dto';
import { SendMessageRequestDto } from '@shared/dtos/notifications/SendMessageRequestDto.dto';

/**
 * Interface for Notification Service.
 * 
 * Provides methods for sending emails and messages.
 * Follows .NET Core's service interface pattern.
 * 
 * @interface INotificationService
 * 
 * @example
 * ```typescript
 * // Send email
 * await notificationService.sendEmail(emailDto);
 * 
 * // Send templated email
 * await notificationService.sendTemplatedEmail(templatedEmailDto);
 * 
 * // Publish message
 * await notificationService.publishMessage(messageDto);
 * ```
 */
export interface INotificationService {
  /**
   * Send a simple email.
   * 
   * @param dto - Email request data
   */
  sendEmail(dto: SendEmailRequestDto): Promise<void>;

  /**
   * Send a templated email.
   * 
   * @param dto - Templated email request data
   */
  sendTemplatedEmail(dto: SendTemplatedEmailRequestDto): Promise<void>;

  /**
   * Publish a message to RabbitMQ.
   * 
   * @param dto - Message request data
   */
  publishMessage(dto: SendMessageRequestDto): Promise<void>;

  /**
   * Send welcome email to new user.
   * 
   * @param email - User email
   * @param userName - User name
   * @param organizationName - Organization name
   */
  sendWelcomeEmail(
    email: string,
    userName: string,
    organizationName: string,
  ): Promise<void>;

  /**
   * Send organization created notification.
   * 
   * @param organizationId - Organization ID
   * @param organizationName - Organization name
   * @param createdBy - Creator name
   */
  notifyOrganizationCreated(
    organizationId: number,
    organizationName: string,
    createdBy: string,
  ): Promise<void>;
}

