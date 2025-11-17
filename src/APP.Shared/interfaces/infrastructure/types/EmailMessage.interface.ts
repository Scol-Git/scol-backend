import { EmailAttachment } from './EmailAttachment.interface';
import { EmailOptions } from './EmailOptions.interface';

/**
 * Represents an email message.
 * 
 * Used by IEmailSender interface for sending emails.
 * Follows .NET Core's EmailMessage pattern.
 * 
 * @interface EmailMessage
 */
export interface EmailMessage {
  /** Recipient email address(es) */
  to: string | string[];

  /** Sender email address */
  from?: string;

  /** Email subject */
  subject: string;

  /** Plain text content */
  text?: string;

  /** HTML content */
  html?: string;

  /** CC recipients */
  cc?: string | string[];

  /** BCC recipients */
  bcc?: string | string[];

  /** Reply-to address */
  replyTo?: string;

  /** Email attachments */
  attachments?: EmailAttachment[];

  /** Additional options */
  options?: EmailOptions;
}

