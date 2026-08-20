import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { UniApplicationStage } from '@entity/entities/UniApplicationStage.entity';

@Injectable()
export class UniStageFlowSeeder {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Ensures the university has a full set of stage-flow rows copied from
   * sys_ApplicationStage. Concurrent first-reads are safe via orIgnore.
   */
  async ensureSeeded(uniId: string): Promise<void> {
    const existingCount = await this.db.uniApplicationStages.count({
      where: { uniId, deletedAt: IsNull() },
    });
    if (existingCount > 0) {
      return;
    }

    const stages = await this.db.applicationStages.find({
      where: { deletedAt: IsNull() },
    });

    stages.sort((a, b) => {
      const ao = a.stageOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.stageOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.stageCode.localeCompare(b.stageCode);
    });

    if (stages.length === 0) {
      return;
    }

    await this.db.transaction(async (manager) => {
      const repo = manager.getRepository(UniApplicationStage);
      const values = stages.map((stage, index) => ({
        uniId,
        sysApplicationStageId: stage.id,
        displayOrder: index + 1,
        isEnabled: true,
      }));
      await repo
        .createQueryBuilder()
        .insert()
        .into(UniApplicationStage)
        .values(values)
        .orIgnore()
        .execute();
    });
  }
}
