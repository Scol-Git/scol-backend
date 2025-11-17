/**
 * Notification Service Implementation
 *
 * Handles sending emails and publishing messages to RabbitMQ.
 * Demonstrates usage of IEmailSender and IMessageSender infrastructure.
 *
 * @class NotificationService
 * @implements {INotificationService}
 */
import { Injectable, Inject } from '@nestjs/common';
import {
  ILogger,
  IEmailSender,
  IMessageSender,
} from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IEmailSender as IEmailSenderInterface } from '@shared/interfaces/infrastructure';
import type { IMessageSender as IMessageSenderInterface } from '@shared/interfaces/infrastructure';
import type { INotificationService } from '@shared/interfaces/services';
import { SendEmailRequestDto } from '@shared/dtos/notifications/SendEmailRequestDto.dto';
import { SendTemplatedEmailRequestDto } from '@shared/dtos/notifications/SendTemplatedEmailRequestDto.dto';
import { SendMessageRequestDto } from '@shared/dtos/notifications/SendMessageRequestDto.dto';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
    @Inject(IEmailSender) private readonly _emailSender: IEmailSenderInterface,
    @Inject(IMessageSender)
    private readonly _messageSender: IMessageSenderInterface,
  ) {}

  /**
   * Send a simple email
   *
   * @param dto - Email request data
   */
  async sendEmail(dto: SendEmailRequestDto): Promise<void> {
    this._logger.LogInfo('Sending email', { to: dto.to, subject: dto.subject });

    if (dto.isHtml) {
      await this._emailSender.sendHtmlEmail(dto.to, dto.subject, dto.body);
    } else {
      await this._emailSender.sendTextEmail(dto.to, dto.subject, dto.body);
    }

    this._logger.LogInfo('Email sent successfully', {
      to: dto.to,
      subject: dto.subject,
    });
  }

  /**
   * Send a templated email
   *
   * @param dto - Templated email request data
   */
  async sendTemplatedEmail(dto: SendTemplatedEmailRequestDto): Promise<void> {
    this._logger.LogInfo('Sending templated email', {
      to: dto.to,
      templateId: dto.templateId,
    });

    await this._emailSender.sendTemplatedEmail(
      dto.templateId,
      dto.to,
      dto.data,
    );

    this._logger.LogInfo('Templated email sent successfully', {
      to: dto.to,
      templateId: dto.templateId,
    });
  }

  /**
   * Publish a message to RabbitMQ
   *
   * @param dto - Message request data
   */
  async publishMessage(dto: SendMessageRequestDto): Promise<void> {
    this._logger.LogInfo('Publishing message to RabbitMQ', {
      queueOrExchange: dto.queueOrExchange,
      routingKey: dto.routingKey,
    });

    await this._messageSender.publish(dto.queueOrExchange, dto.message, {
      routingKey: dto.routingKey,
    });

    this._logger.LogInfo('Message published successfully', {
      queueOrExchange: dto.queueOrExchange,
      routingKey: dto.routingKey,
    });
  }

  /**
   * Send welcome email to new user
   *
   * @param email - User email
   * @param userName - User name
   * @param organizationName - Organization name
   */
  async sendWelcomeEmail(
    email: string,
    userName: string,
    organizationName: string,
  ): Promise<void> {
    this._logger.LogInfo('Sending welcome email', { email, userName });

    await this._emailSender.sendTemplatedEmail('welcome', email, {
      userName,
      organizationName,
    });

    this._logger.LogInfo('Welcome email sent successfully', { email });
  }

  /**
   * Send organization created notification (email + message)
   *
   * @param organizationId - Organization ID
   * @param organizationName - Organization name
   * @param createdBy - Creator name
   */
  async notifyOrganizationCreated(
    organizationId: number,
    organizationName: string,
    createdBy: string,
  ): Promise<void> {
    this._logger.LogInfo('Notifying organization created', {
      organizationId,
      organizationName,
    });

    // 1. Send email notification
    await this._emailSender.sendTemplatedEmail(
      'organization-created',
      'admin@scol.com', // In real app, get from config or admin users
      {
        organizationName,
        createdBy,
        createdAt: new Date().toISOString(),
      },
    );

    // 2. Publish event to RabbitMQ
    await this._messageSender.publish(
      'scol.events',
      {
        eventType: 'OrganizationCreated',
        organizationId,
        organizationName,
        createdBy,
        timestamp: new Date().toISOString(),
      },
      {
        routingKey: 'organization.created',
      },
    );

    this._logger.LogInfo('Organization created notification sent successfully');
  }
}
