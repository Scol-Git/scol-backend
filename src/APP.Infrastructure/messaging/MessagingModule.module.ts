/**
 * Messaging Module
 *
 * Configures messaging and email infrastructure services.
 * Provides RabbitMQ message sender and SMTP/Console email sender.
 *
 * @module MessagingModule
 */
import { Module } from '@nestjs/common';
import {
  IMessageSender,
  IEmailSender,
  ILogger,
  IInfrastructureConfig,
} from '@shared/tokens/injection.tokens';
import { RabbitMQMessageSender } from './RabbitMQMessageSender.service';
import { SmtpEmailSender } from './SmtpEmailSender.service';
import { ConsoleEmailSender } from './ConsoleEmailSender.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

@Module({
  imports: [LoggingModule],
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
      useFactory: (config: IInfrastructureConfigInterface, logger: ILoggerInterface) => {
        const emailProvider = config.email.provider;

        // Use console email sender for development/testing
        if (emailProvider === 'console') {
          logger.LogInfo('Using ConsoleEmailSender (development mode)', {
            emailProvider,
          });
          return new ConsoleEmailSender(logger);
        }

        // Use SMTP email sender for production
        const host = config.email.smtp.host;
        const port = config.email.smtp.port;
        logger.LogInfo('Using SmtpEmailSender', {
          emailProvider,
          host: host || 'MISSING',
          port: port || 'MISSING',
        });
        return new SmtpEmailSender(config, logger);
      },
      inject: [IInfrastructureConfig, ILogger],
    },
  ],
  exports: [IMessageSender, IEmailSender],
})
export class MessagingModule {}
