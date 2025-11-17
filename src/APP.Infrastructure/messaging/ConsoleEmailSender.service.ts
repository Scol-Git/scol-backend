/**
 * Console Email Sender Implementation
 *
 * Development/testing implementation of IEmailSender that logs emails to console.
 * Useful for local development without configuring SMTP.
 *
 * @class ConsoleEmailSender
 * @implements {IEmailSender}
 */
import { Injectable, Inject } from '@nestjs/common';
import type { IEmailSender } from '@shared/interfaces/infrastructure';
import type { EmailMessage, EmailOptions } from '@shared/interfaces/infrastructure/types';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

@Injectable()
export class ConsoleEmailSender implements IEmailSender {
  constructor(
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {}

  /**
   * Log email to console instead of sending
   */
  async sendEmail(email: EmailMessage): Promise<void> {
    this._logger.LogInfo('📧 [CONSOLE EMAIL] Email would be sent:', {
      from: email.from || 'noreply@scol.com',
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      hasText: !!email.text,
      hasHtml: !!email.html,
      attachmentCount: email.attachments?.length || 0,
    });

    // Log content preview
    if (email.text) {
      console.log('\n📝 Text Content:');
      console.log(email.text.substring(0, 200) + '...');
    }

    if (email.html) {
      console.log('\n🌐 HTML Content:');
      console.log(email.html.substring(0, 200) + '...');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Log batch emails to console
   */
  async sendBatch(emails: EmailMessage[]): Promise<void> {
    this._logger.LogInfo(
      `📧 [CONSOLE EMAIL] Batch of ${emails.length} emails would be sent`,
    );

    for (const email of emails) {
      await this.sendEmail(email);
    }
  }

  /**
   * Log templated email to console
   */
  async sendTemplatedEmail(
    templateId: string,
    to: string,
    data: Record<string, any>,
    options?: EmailOptions,
  ): Promise<void> {
    this._logger.LogInfo('📧 [CONSOLE EMAIL] Templated email would be sent:', {
      templateId,
      to,
      data,
      options,
    });
  }

  /**
   * Log HTML email to console
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
   * Log text email to console
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
}

