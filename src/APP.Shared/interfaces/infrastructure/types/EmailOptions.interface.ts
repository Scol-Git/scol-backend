/**
 * Additional email options.
 * 
 * Used by EmailMessage and IEmailSender for configuring email behavior.
 * 
 * @interface EmailOptions
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

