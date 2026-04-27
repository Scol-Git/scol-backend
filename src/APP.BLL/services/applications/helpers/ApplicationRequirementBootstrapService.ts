import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Applications } from '@entity/entities/Applications.entity';
import { ApplicationRequirementResolver } from './ApplicationRequirementResolver';

/**
 * Orchestrates creation-time requirement snapshot.
 */
@Injectable()
export class ApplicationRequirementBootstrapService {
  constructor(
    private readonly requirementResolver: ApplicationRequirementResolver,
  ) {}

  async bootstrapForNewApplication(
    manager: EntityManager,
    application: Applications,
    sysCountryId: string,
  ): Promise<void> {
    await this.requirementResolver.generateSnapshotForApplication(
      manager,
      application.id,
      sysCountryId,
    );
  }
}
