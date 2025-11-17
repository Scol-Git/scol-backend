import type { EmailMessage, EmailOptions } from './types';

/**
 * Interface for email sending service (SMTP/SendGrid implementation).
 * 
 * Provides abstraction for email operations.
 * Follows .NET Core's IEmailSender pattern.
 * 
 * @interface IEmailSender
 * 
 * @example
 * ```typescript
 * // Send simple email
 * await emailSender.sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Welcome!</h1>'
 * });
 * 
 * // Send templated email
 * await emailSender.sendTemplatedEmail(
 *   'welcome-template',
 *   'user@example.com',
 *   { userName: 'John' }
 * );
 * ```
 */
export interface IEmailSender {
  /**
   * Send a single email.
   * 
   * @param email - Email data
   */
  sendEmail(email: EmailMessage): Promise<void>;

  /**
   * Send multiple emails in batch.
   * 
   * @param emails - Array of email messages
   */
  sendBatch(emails: EmailMessage[]): Promise<void>;

  /**
   * Send email using a template.
   * 
   * @param templateId - Template identifier
   * @param to - Recipient email address
   * @param data - Template data/variables
   * @param options - Additional options
   */
  sendTemplatedEmail(
    templateId: string,
    to: string,
    data: Record<string, any>,
    options?: EmailOptions,
  ): Promise<void>;

  /**
   * Send email with HTML content.
   * 
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - HTML content
   * @param options - Additional options
   */
  sendHtmlEmail(
    to: string,
    subject: string,
    htmlContent: string,
    options?: EmailOptions,
  ): Promise<void>;

  /**
   * Send plain text email.
   * 
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param textContent - Plain text content
   * @param options - Additional options
   */
  sendTextEmail(
    to: string,
    subject: string,
    textContent: string,
    options?: EmailOptions,
  ): Promise<void>;
}

