import { NestFactory } from '@nestjs/core';
import { AppModule } from '../AppModule.module';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import { Role } from '@shared/enums/Role.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(AppDbContext);
  const logger = app.get<ILoggerInterface>(ILogger);
  const roleRepo = db.roles;

  for (const roleName of Object.values(Role)) {
    const existing = await roleRepo.findOne({ where: { name: roleName } });
    if (existing) {
      logger.LogInfo(`Role already exists (${roleName})`);
      continue;
    }

    await roleRepo.save(roleRepo.create({ name: roleName }));
    logger.LogInfo(`Role created (${roleName})`);
  }

  await app.close();
}

bootstrap();
