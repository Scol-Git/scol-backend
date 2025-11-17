/**
 * Represents an email attachment.
 * 
 * Used by EmailMessage interface for attaching files to emails.
 * 
 * @interface EmailAttachment
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

