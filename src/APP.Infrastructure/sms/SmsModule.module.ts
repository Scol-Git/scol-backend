import { Module } from '@nestjs/common';
import { SmsService } from './SmsService.service';
import { ISmsService } from '@shared/tokens/injection.tokens';

/**
 * SMS Module (Infrastructure)
 *
 * Provides SMS sending capabilities via external provider.
 * Exports ISmsService interface for dependency injection.
 *
 * Usage in other modules:
 * @Module({
 *   imports: [SmsModule],
 *   // ...
 * })
 *
 * Then inject via:
 * @Inject(ISmsService) private readonly sms: ISmsService
 */
@Module({
  providers: [
    {
      provide: ISmsService,
      useClass: SmsService,
    },
  ],
  exports: [ISmsService],
})
export class SmsModule {}
