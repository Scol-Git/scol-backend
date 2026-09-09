import { Module } from '@nestjs/common';
import { UserSessionCleanupService } from './UserSessionCleanupService';
import { AccountLockoutMaintenanceService } from './AccountLockoutMaintenanceService';

@Module({
  providers: [UserSessionCleanupService, AccountLockoutMaintenanceService],
  exports: [UserSessionCleanupService, AccountLockoutMaintenanceService],
})
export class AuthJobServicesModule {}
