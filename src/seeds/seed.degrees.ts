import { NestFactory } from '@nestjs/core';
import { AppModule } from '../AppModule.module';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

const DEGREE_SEEDS = [
  { degreeName: 'SSC', levelOrder: 1, gpaScale: '5.00' },
  { degreeName: 'HSC', levelOrder: 2, gpaScale: '5.00' },
  { degreeName: 'BSc', levelOrder: 3, gpaScale: '4.00' },
  { degreeName: 'MSc', levelOrder: 4, gpaScale: '4.00' },
] as const;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(AppDbContext);
  const logger = app.get<ILoggerInterface>(ILogger);
  const degreeRepo = db.academicDegrees;

  for (const seed of DEGREE_SEEDS) {
    const existing = await degreeRepo.findOne({
      where: { degreeName: seed.degreeName },
    });

    if (!existing) {
      await degreeRepo.save(degreeRepo.create(seed));
      logger.LogInfo(`Degree created (${seed.degreeName}, level ${seed.levelOrder})`);
      continue;
    }

    existing.levelOrder = seed.levelOrder;
    existing.gpaScale = seed.gpaScale;
    await degreeRepo.save(existing);
    logger.LogInfo(`Degree updated (${seed.degreeName}, level ${seed.levelOrder})`);
  }

  await app.close();
}

bootstrap();
