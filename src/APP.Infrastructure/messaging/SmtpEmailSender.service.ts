/**
 * SMTP Email Sender Implementation
 *
 * Concrete implementation of IEmailSender using Nodemailer with SMTP.
 * Supports HTML/text emails, templates, and attachments.
 *
 * @class SmtpEmailSender
 * @implements {IEmailSender}
 */
import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { IEmailSender } from '@shared/interfaces/infrastructure';
import type {
  EmailMessage,
  EmailOptions,
} from '@shared/interfaces/infrastructure/types';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import {
  ILogger,
  IInfrastructureConfig as IInfrastructureConfigToken,
} from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

@Injectable()
export class SmtpEmailSender implements IEmailSender, OnModuleInit {
  private _transporter: Transporter | null = null;
  private _isConfigured = false;
  private _defaultFrom: string;

  constructor(
    @Inject(IInfrastructureConfigToken)
    private readonly _config: IInfrastructureConfig,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {
    // Will be set properly in onModuleInit after config is fully loaded
    this._defaultFrom = 'noreply@scol.com';
  }

  /**
   * Initialize SMTP transporter on module startup
   */
  async onModuleInit(): Promise<void> {
    const host = this._config.email.smtp.host;
    const port = this._config.email.smtp.port;

    // Validate required configuration
    if (!host || !port) {
      this._logger.LogWarning(
        'SMTP not configured. Email functionality will be disabled.',
        {
          host: host || 'MISSING',
          port: port || 'MISSING',
        },
      );
      return;
    }

    // Use secure from config (already parsed as boolean)
    const secure = this._config.email.smtp.secure ?? port === 465;

    const user = this._config.email.smtp.user;
    const pass = this._config.email.smtp.password;

    // Read SMTP_FROM and update default
    const smtpFrom = this._config.email.smtp.from;
    if (smtpFrom) {
      // Remove surrounding quotes if present
      this._defaultFrom = smtpFrom.replace(/^["']|["']$/g, '').trim();
    }

    // Log configuration for debugging
    this._logger.LogInfo('Configuring SMTP transporter', {
      host,
      port,
      secure,
      hasUser: !!user,
      hasPass: !!pass,
      userLength: user?.length || 0,
      defaultFrom: this._defaultFrom,
      smtpFromRaw: smtpFrom || 'NOT SET',
    });

    if (!user || !pass) {
      this._logger.LogWarning(
        'SMTP credentials missing. Email functionality will be disabled.',
        {
          hasUser: !!user,
          hasPass: !!pass,
        },
      );
      return;
    }

    try {
      // Create transporter - 'from' will be set per email in sendMail()
      this._transporter = nodemailer.createTransport({
        host,
        port,
        secure, // true for 465 (SSL), false for 587/25 (STARTTLS)
        auth: {
          user,
          pass,
        },
        // Additional options for better reliability
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100,
        // TLS options for STARTTLS
        tls: {
          // Don't fail on invalid certificates (useful for local/dev SMTP)
          rejectUnauthorized: false,
        },
      });

      // Verify connection (tests credentials and connectivity)
      await this._transporter.verify();
      this._isConfigured = true;

      this._logger.LogInfo('SMTP connection verified successfully', {
        host,
        port,
        secure,
        authMethod: secure ? 'SSL/TLS' : 'STARTTLS',
        defaultFrom: this._defaultFrom,
      });
    } catch (error) {
      const errorCode =
        error && typeof error === 'object' && 'code' in error
          ? (error as { code: unknown }).code
          : undefined;
      const errorReason =
        error && typeof error === 'object' && 'reason' in error
          ? (error as { reason: unknown }).reason
          : undefined;

      this._logger.LogError('Failed to configure SMTP transporter', error, {
        host,
        port,
        secure,
        errorCode,
        errorReason,
        suggestion:
          port === 587 && secure
            ? 'Port 587 requires SMTP_SECURE=false (STARTTLS)'
            : port === 465 && !secure
              ? 'Port 465 requires SMTP_SECURE=true (SSL)'
              : 'Check SMTP credentials and network connectivity',
      });
      this._isConfigured = false;
    }
  }

  /**
   * Send a single email
   *
   * @param email - Email message data
   */
  async sendEmail(email: EmailMessage): Promise<void> {
    if (!this._isConfigured || !this._transporter) {
      this._logger.LogWarning('SMTP not configured. Email will not be sent.', {
        to: email.to,
        subject: email.subject,
      });
      return;
    }

    try {
      // Use SMTP_FROM if email.from is not explicitly provided
      const fromAddress = email.from || this._defaultFrom;

      // Log what we're attempting to use (helpful for debugging Gmail overrides)
      this._logger.LogInfo('Sending email with FROM address', {
        from: fromAddress,
        smtpUser: this._config.email.smtp.user,
        note: "Gmail may override FROM if domain doesn't match authenticated account",
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const sendResult = await this._transporter.sendMail({
        from: fromAddress,
        to: email.to,
        cc: email.cc,
        bcc: email.bcc,
        subject: email.subject,
        text: email.text,
        html: email.html,
        replyTo: email.replyTo,
        attachments: email.attachments,
        priority: email.options?.priority,
        headers: email.options?.headers,
      });

      const messageId: string | undefined =
        sendResult &&
        typeof sendResult === 'object' &&
        'messageId' in sendResult &&
        typeof (sendResult as { messageId: unknown }).messageId === 'string'
          ? (sendResult as { messageId: string }).messageId
          : undefined;

      this._logger.LogInfo('📧 Email sent successfully', {
        to: email.to,
        subject: email.subject,
        from: fromAddress,
        messageId,
      });
    } catch (error) {
      this._logger.LogError('Failed to send email', error, {
        to: email.to,
        subject: email.subject,
      });
      throw error;
    }
  }

  /**
   * Send multiple emails in batch
   *
   * @param emails - Array of email messages
   */
  async sendBatch(emails: EmailMessage[]): Promise<void> {
    if (!this._isConfigured) {
      this._logger.LogWarning(
        'SMTP not configured. Batch emails will not be sent.',
        { count: emails.length },
      );
      return;
    }

    try {
      const promises = emails.map((email) => this.sendEmail(email));
      await Promise.all(promises);

      this._logger.LogInfo('Batch emails sent successfully', {
        count: emails.length,
      });
    } catch (error) {
      this._logger.LogError('Failed to send batch emails', error);
      throw error;
    }
  }

  /**
   * Send email using a template
   *
   * @param templateId - Template identifier
   * @param to - Recipient email address
   * @param data - Template data/variables
   * @param options - Additional email options
   */
  async sendTemplatedEmail(
    templateId: string,
    to: string,
    data: Record<string, any>,
    options?: EmailOptions,
  ): Promise<void> {
    try {
      // Load template (in a real implementation, load from filesystem or database)
      const template = this._loadTemplate(templateId);
      const subject = this._renderTemplate(template.subject, data);
      const htmlContent = this._renderTemplate(template.body, data);

      await this.sendHtmlEmail(to, subject, htmlContent, options);

      this._logger.LogInfo('Templated email sent successfully', {
        to,
        templateId,
      });
    } catch (error) {
      this._logger.LogError('Failed to send templated email', error, {
        to,
        templateId,
      });
      throw error;
    }
  }

  /**
   * Send email with HTML content
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param htmlContent - HTML content
   * @param options - Additional email options
   */
  async sendHtmlEmail(
    to: string,
    subject: string,
    htmlContent: string,
    options?: EmailOptions,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject,
      html: htmlContent,
      options,
    });
  }

  /**
   * Send plain text email
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param textContent - Plain text content
   * @param options - Additional email options
   */
  async sendTextEmail(
    to: string,
    subject: string,
    textContent: string,
    options?: EmailOptions,
  ): Promise<void> {
    await this.sendEmail({
      to,
      subject,
      text: textContent,
      options,
    });
  }

  /**
   * Load email template (placeholder implementation)
   * In production, load from filesystem, database, or external service
   */
  private _loadTemplate(templateId: string): { subject: string; body: string } {
    // Placeholder templates
    const templates: Record<string, { subject: string; body: string }> = {
      welcome: {
        subject: 'Welcome to SCOL - {{organizationName}}',
        body: `
          <h1>Welcome, {{userName}}!</h1>
          <p>Your account has been created successfully for organization: <strong>{{organizationName}}</strong></p>
          <p>We're excited to have you on board!</p>
        `,
      },
      'organization-created': {
        subject: 'Organization Created - {{organizationName}}',
        body: `
          <h1>Organization Created Successfully</h1>
          <p>Organization Name: <strong>{{organizationName}}</strong></p>
          <p>Created By: {{createdBy}}</p>
          <p>Date: {{createdAt}}</p>
        `,
      },
    };

    if (!templates[templateId]) {
      throw new Error(`Template not found: ${templateId}`);
    }

    return templates[templateId];
  }

  /**
   * Simple template rendering (replace {{key}} with data[key])
   */
  private _renderTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }
}
