/**
 * Messaging Module
 *
 * Configures messaging and email infrastructure services.
 * Provides RabbitMQ message sender and SMTP/Console email sender.
 *
 * @module MessagingModule
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  IMessageSender,
  IEmailSender,
  ILogger,
} from '@shared/tokens/injection.tokens';
import { RabbitMQMessageSender } from './RabbitMQMessageSender.service';
import { SmtpEmailSender } from './SmtpEmailSender.service';
import { ConsoleEmailSender } from './ConsoleEmailSender.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging/ILogger.interface';

@Module({
  imports: [ConfigModule, LoggingModule],
  providers: [
    // ============================================================================
    // Message Sender Provider (RabbitMQ)
    // ============================================================================
    {
      provide: IMessageSender,
      useClass: RabbitMQMessageSender,
    },

    // ============================================================================
    // Email Sender Provider (SMTP or Console based on environment)
    // ============================================================================
    {
      provide: IEmailSender,
      useFactory: (configService: ConfigService, logger: ILoggerInterface) => {
        const emailProvider = configService.get<string>(
          'EMAIL_PROVIDER',
          'console',
        );

        // Use console email sender for development/testing
        if (emailProvider === 'console') {
          logger.LogInfo('Using ConsoleEmailSender (development mode)', {
            emailProvider,
          });
          return new ConsoleEmailSender(logger);
        }

        // Use SMTP email sender for production
        const host = configService.get<string>('SMTP_HOST');
        const port = configService.get<string>('SMTP_PORT');
        logger.LogInfo('Using SmtpEmailSender', {
          emailProvider,
          host: host || 'MISSING',
          port: port || 'MISSING',
        });
        return new SmtpEmailSender(configService, logger);
      },
      inject: [ConfigService, ILogger],
    },
  ],
  exports: [IMessageSender, IEmailSender],
})
export class MessagingModule {}
