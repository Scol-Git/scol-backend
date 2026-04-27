import { NestFactory } from '@nestjs/core';
import { AppModule } from '../AppModule.module';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import { Role } from '@shared/enums/Role.enum';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const db = app.get(AppDbContext);
  const hasher = app.get<IPasswordHasher>(IPasswordHasherToken);
  const logger = app.get<ILoggerInterface>(ILogger);

  const roleRepo = db.roles;
  const userRepo = db.users;

  // 1. Ensure ADMIN role exists
  let adminRole = await roleRepo.findOne({
    where: { name: Role.ADMIN },
  });

  if (!adminRole) {
    adminRole = roleRepo.create({ name: Role.ADMIN });
    await roleRepo.save(adminRole);
    console.log('ADMIN role created');
  }

  // 2. Check if admin user exists
  let adminUser = await userRepo.findOne({
    where: { email: 'admin@scol.com' },
    relations: { roles: true },
  });

  if (!adminUser) {
    adminUser = userRepo.create({
      email: 'admin@scol.com',
      phone: '+8801837917991', // use valid format
      passwordHash: await hasher.hash('AdminChangeMeNow123!'),
      accountStatus: AccountStatus.Active,
      userType: UserType.Admin, // or Staff
      isPhoneVerified: true,
      failedLoginAttempts: 0,
      roles: [adminRole],
    });

    await userRepo.save(adminUser);
    logger.LogInfo('Admin user created');
  } else {
    logger.LogWarning('Admin already exists');
  }

  await app.close();
}

bootstrap();
