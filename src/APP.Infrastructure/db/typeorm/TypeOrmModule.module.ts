import { Global, Module } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import { IInfrastructureConfig as IInfrastructureConfigToken } from '@shared/tokens/injection.tokens';

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
import { PendingRegistration } from '@entity/entities/PendingRegistration.entity';
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
        const base: DataSourceOptions = url
          ? { type: 'postgres', url }
          : {
              type: 'postgres',
              host: config.database.host,
              port: config.database.port,
              username: config.database.username,
              password: config.database.password,
              database: config.database.database,
            };

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
            PendingRegistration,
          ],
          synchronize: false,
          logging:
            cfg.get('NODE_ENV') === 'development'
              ? ['error', 'warn']
              : ['error'],
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
      PendingRegistration,
    ]),
  ],
  providers: [AppDbContext],
  exports: [AppDbContext],
})
export class TypeOrmModule {}
