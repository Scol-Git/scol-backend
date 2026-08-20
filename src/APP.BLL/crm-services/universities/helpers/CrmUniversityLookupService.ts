import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';

@Injectable()
export class CrmUniversityLookupService {
  constructor(private readonly db: AppDbContext) {}

  async loadUniversityOrThrow(uniId: string): Promise<SysUniversities> {
    const university = await this.db.universities.findOne({
      where: { id: uniId, deletedAt: IsNull() },
      relations: {
        SysCountry: true,
        SysState: true,
        SysCity: true,
      },
    });

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return university;
  }
}
