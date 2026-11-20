import { NestFactory } from '@nestjs/core';
import { AppModule } from '../AppModule.module';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

const ENGLISH_TEST_SEEDS = [
  { testName: 'IELTS', maxScore: '9.00' },
  { testName: 'PTE', maxScore: '90.00' },
  { testName: 'TOEFL', maxScore: '6.00' },
] as const;

const TOEFL_SECTION_NAMES = ['Reading', 'Listening', 'Speaking', 'Writing'] as const;
const TOEFL_SECTION_MAX = '6.00';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(AppDbContext);
  const logger = app.get<ILoggerInterface>(ILogger);
  const testRepo = db.englishTests;

  for (const seed of ENGLISH_TEST_SEEDS) {
    const existing = await testRepo.findOne({
      where: { testName: seed.testName },
    });

    if (!existing) {
      await testRepo.save(testRepo.create(seed));
      logger.LogInfo(`English test created (${seed.testName}, max ${seed.maxScore})`);
      continue;
    }

    await testRepo.update(existing.id, {
      maxScore: seed.maxScore,
      levelOrder: () => 'NULL',
    });
    logger.LogInfo(`English test updated (${seed.testName}, max ${seed.maxScore})`);
  }

  const toefl = await testRepo.findOne({ where: { testName: 'TOEFL' } });
  if (toefl) {
    const sectionRepo = db.englishTestSections;
    for (const sectionName of TOEFL_SECTION_NAMES) {
      const existing = await sectionRepo.findOne({
        where: { testId: toefl.id, sectionName },
      });
      if (!existing) {
        await sectionRepo.save(
          sectionRepo.create({
            testId: toefl.id,
            sectionName,
            maxScore: TOEFL_SECTION_MAX,
          }),
        );
        logger.LogInfo(`TOEFL section created (${sectionName}, max ${TOEFL_SECTION_MAX})`);
        continue;
      }
      await sectionRepo.update(existing.id, { maxScore: TOEFL_SECTION_MAX });
      logger.LogInfo(`TOEFL section updated (${sectionName}, max ${TOEFL_SECTION_MAX})`);
    }
  }

  await app.close();
}

bootstrap();
