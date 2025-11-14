/**
 * Interface for email sending service (SMTP/SendGrid implementation)
 * 
 * Provides abstraction for email operations.
 * Following .NET's IEmailSender pattern.
 * 
 * @interface IEmailSender
 * 
 * TODO: Implement email service (Nodemailer/SendGrid) in Phase 3+
 */
export interface IEmailSender {
  /**
   * Send a single email
   * 
   * @param email - Email data
   */
  sendEmail(email: EmailMessage): Promise<void>;

  /**
   * Send multiple emails in batch
   * 
   * @param emails - Array of email messages
   */
  sendBatch(emails: EmailMessage[]): Promise<void>;

  /**
   * Send email using a template
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
   * Send email with HTML content
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
   * Send plain text email
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

/**
 * Represents an email message
 */
export interface EmailMessage {
  /** Recipient email address */
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

/**
 * Email attachment
 */
export interface EmailAttachment {
  /** Filename */
  filename: string;

  /** File content (Buffer or base64 string) */
  content: Buffer | string;

  /** Content type (MIME type) */
  contentType?: string;

  /** Content disposition (attachment or inline) */
  disposition?: 'attachment' | 'inline';

  /** Content ID (for inline images) */
  cid?: string;
}

/**
 * Additional email options
 */
export interface EmailOptions {
  /** Priority (high, normal, low) */
  priority?: 'high' | 'normal' | 'low';

  /** Custom headers */
  headers?: Record<string, string>;

  /** Tracking options */
  tracking?: {
    opens?: boolean;
    clicks?: boolean;
  };

  /** Tags for categorization */
  tags?: string[];
}


