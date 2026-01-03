import { Global, Module } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import { IInfrastructureConfig as IInfrastructureConfigToken } from '@shared/tokens/injection.tokens';
import { getAppStage } from '@infra/config/getAppStage';

// Import QueryBuilder extension methods to register them globally
import '../extensions/QueryBuilderExtensions';

// Import entities
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { SysPermissions } from '@entity/entities/SysPermissions.entity';
import { SysRoles } from '@entity/entities/SysRoles.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadTestResults } from '@entity/entities/LeadTestResults.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { UserPermissions } from '@entity/entities/UserPermissions.entity';
import { UserRoles } from '@entity/entities/UserRoles.entity';
import { OtpSession } from '@entity/entities/OtpSession.entity';
import { AppDbContext } from './AppDbContext';

@Global()
@Module({
  imports: [
    NestTypeOrmModule.forRootAsync({
      inject: [IInfrastructureConfigToken, ConfigService],
      useFactory: (
        config: IInfrastructureConfig,
        cfg: ConfigService,
      ): DataSourceOptions => {
        const url = config.database.url;
        const base: DataSourceOptions = { type: 'postgres', url };

        return {
          ...base,
          entities: [
            SysCountries,
            SysAcademicDegrees,
            SysEnglishTests,
            SysProgrammes,
            SysPermissions,
            SysRoles,
            SysLeadProfiles,
            SysUsers,
            LeadAcademicResults,
            LeadTestResults,
            LeadPreferredCountries,
            LeadPreferredPrograms,
            UserSessions,
            UserPermissions,
            UserRoles,
            OtpSession,
          ],
          synchronize: false,
          logging: getAppStage() === 'dev' ? ['error', 'warn'] : ['error'],
          // Serverless-optimized connection pool settings
          // Keeps connections minimal to avoid exhausting Neon/serverless DB limits
          extra: {
            max: 2, // Maximum connections per serverless instance
            idleTimeoutMillis: 10000, // Close idle connections after 10s
            connectionTimeoutMillis: 10000, // Timeout for new connections
          },
        };
      },
    }),

    NestTypeOrmModule.forFeature([
      SysCountries,
      SysAcademicDegrees,
      SysEnglishTests,
      SysProgrammes,
      SysPermissions,
      SysRoles,
      SysLeadProfiles,
      SysUsers,
      LeadAcademicResults,
      LeadTestResults,
      LeadPreferredCountries,
      LeadPreferredPrograms,
      UserSessions,
      UserPermissions,
      UserRoles,
      OtpSession,
    ]),
  ],
  providers: [AppDbContext],
  exports: [AppDbContext],
})
export class TypeOrmModule {}
