import { Module } from '@nestjs/common';
import { NotificationController } from './NotificationController.controller';
import { NotificationService } from '@bll/services/NotificationService.service';
import { INotificationService } from '@shared/tokens/injection.tokens';
import { MessagingModule } from '@infra/messaging/MessagingModule.module';

/**
 * Notification Feature Module
 * 
 * Registers notification-related controllers and services.
 * Imports MessagingModule for IEmailSender and IMessageSender (non-global).
 */
@Module({
  imports: [
    MessagingModule, // Provides IEmailSender, IMessageSender
  ],
  controllers: [NotificationController],
  providers: [
    {
      provide: INotificationService,
      useClass: NotificationService,
    },
  ],
})
export class NotificationModule {}

