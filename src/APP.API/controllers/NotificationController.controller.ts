/**
 * Notification Controller
 *
 * REST API endpoints for testing messaging and email infrastructure.
 * Demonstrates usage of NotificationService with RabbitMQ and SMTP.
 *
 * @class NotificationController
 */
import { Controller, Post, Body, Inject } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ILogger, INotificationService } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging/ILogger.interface';
import type { INotificationService as INotificationServiceInterface } from '@shared/interfaces/services/INotificationService.interface';
import { SendEmailRequestDto } from '@shared/dtos/notifications/SendEmailRequestDto.dto';
import { SendTemplatedEmailRequestDto } from '@shared/dtos/notifications/SendTemplatedEmailRequestDto.dto';
import { SendMessageRequestDto } from '@shared/dtos/notifications/SendMessageRequestDto.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject(INotificationService)
    private readonly _service: INotificationServiceInterface,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {}

  /**
   * POST /notifications/email
   * Send a simple email (HTML or text)
   */
  @Post('email')
  @ApiOperation({
    summary: 'Send an email',
    description:
      'Send a simple text or HTML email. Uses SMTP (production) or console logging (development).',
  })
  @ApiOkResponse({
    description: 'Email sent successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid email request',
  })
  async sendEmail(@Body() body: SendEmailRequestDto): Promise<void> {
    await this._service.sendEmail(body);
    this._logger.LogInfo('Email sent via API', {
      to: body.to,
      subject: body.subject,
    });
  }

  /**
   * POST /notifications/email/templated
   * Send a templated email
   */
  @Post('email/templated')
  @ApiOperation({
    summary: 'Send a templated email',
    description:
      'Send an email using a predefined template (welcome, organization-created).',
  })
  @ApiOkResponse({
    description: 'Templated email sent successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid templated email request',
  })
  async sendTemplatedEmail(
    @Body() body: SendTemplatedEmailRequestDto,
  ): Promise<void> {
    await this._service.sendTemplatedEmail(body);
    this._logger.LogInfo('Templated email sent via API', {
      to: body.to,
      templateId: body.templateId,
    });
  }

  /**
   * POST /notifications/message
   * Publish a message to RabbitMQ
   */
  @Post('message')
  @ApiOperation({
    summary: 'Publish a message to RabbitMQ',
    description:
      'Publish a message to RabbitMQ exchange with optional routing key.',
  })
  @ApiOkResponse({
    description: 'Message published successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid message request',
  })
  async publishMessage(@Body() body: SendMessageRequestDto): Promise<void> {
    await this._service.publishMessage(body);
    this._logger.LogInfo('Message published via API', {
      queueOrExchange: body.queueOrExchange,
      routingKey: body.routingKey,
    });
  }

  /**
   * POST /notifications/test/welcome
   * Test endpoint: Send a welcome email
   */
  @Post('test/welcome')
  @ApiOperation({
    summary: 'Test: Send welcome email',
    description: 'Test endpoint to send a welcome email using template.',
  })
  @ApiOkResponse({
    description: 'Welcome email sent successfully',
  })
  async testWelcomeEmail(
    @Body()
    body: {
      email: string;
      userName: string;
      organizationName: string;
    },
  ): Promise<void> {
    await this._service.sendWelcomeEmail(
      body.email,
      body.userName,
      body.organizationName,
    );
    this._logger.LogInfo('Welcome email test sent', { email: body.email });
  }

  /**
   * POST /notifications/test/organization-created
   * Test endpoint: Send organization created notification (email + message)
   */
  @Post('test/organization-created')
  @ApiOperation({
    summary: 'Test: Send organization created notification',
    description:
      'Test endpoint to send organization created notification (email + RabbitMQ message).',
  })
  @ApiOkResponse({
    description: 'Organization created notification sent successfully',
  })
  async testOrganizationCreated(
    @Body()
    body: {
      organizationId: number;
      organizationName: string;
      createdBy: string;
    },
  ): Promise<void> {
    await this._service.notifyOrganizationCreated(
      body.organizationId,
      body.organizationName,
      body.createdBy,
    );
    this._logger.LogInfo('Organization created notification test sent', {
      organizationId: body.organizationId,
    });
  }
}
