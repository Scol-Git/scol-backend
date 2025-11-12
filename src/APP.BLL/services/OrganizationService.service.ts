import { Injectable, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Organization } from '@entity/entities/Organization.entity';
import { AppLogger } from '@infra/logging/AppLogger.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly ds: DataSource,
    private readonly logger: AppLogger,
  ) {}

  async list(): Promise<Organization[]> {
    this.logger.LogInfo('Listing organizations');
    return this.ds
      .getRepository(Organization)
      .find({ order: { createdAt: 'DESC' } });
  }

  async create(name: string): Promise<Organization> {
    const repo = this.ds.getRepository(Organization);

    const exists = await repo.findOne({ where: { name } });
    if (exists) {
      this.logger.LogWarning('Organization already exists', { name });
      throw new ConflictException('Organization already exists');
    }

    const org = repo.create({ name });
    await repo.save(org);

    this.logger.LogInfo('Organization created', { orgId: org.id, name });
    return org;
  }
}
