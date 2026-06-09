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

const CONSULTANT_USER = {
  email: 'contact@getscol.com',
  phone: '+8801872111917',
  password: 'ConsultantChangeMeNow123!',
} as const;

const CONSULTANT_PROFILE = {
  fullName: 'Md. Shafayat Jamil',
  designation: 'FOUNDER & CEO',
  organization: 'SCOL',
  bio: 'Md. Shafayat Jamil is the Founder & CEO of SCOL and a British Council certified expert specializing in student admissions for top-tier universities in the UK, Australia, and New Zealand. He guides students through university admissions, visas, and career pathways abroad while providing personalized support throughout their study-abroad journey.',
  contactPhone: '+8801872111917',
  contactEmail: 'contact@getscol.com',
  officeHours: 'Sat-Thu 10AM - 6PM',
  isPublished: true,
  sortOrder: 1,
} as const;

const CONSULTANT_CERTIFICATIONS = [
  {
    issuingOrganization: 'BRITISH COUNCIL',
    certificateName: 'UK Agent & Counsellor Training Certificate',
    issuedDate: new Date('2026-02-07'),
    certRole: 'Agent',
    certificateId: '96243',
    sortOrder: 1,
  },
] as const;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const db = app.get(AppDbContext);
  const hasher = app.get<IPasswordHasher>(IPasswordHasherToken);
  const logger = app.get<ILoggerInterface>(ILogger);

  const roleRepo = db.roles;
  const userRepo = db.users;
  const profileRepo = db.consultantProfiles;
  const certRepo = db.consultantCertifications;

  let adminRole = await roleRepo.findOne({
    where: { name: Role.ADMIN },
  });

  if (!adminRole) {
    adminRole = roleRepo.create({ name: Role.ADMIN });
    await roleRepo.save(adminRole);
    console.log('ADMIN role created');
  }

  let consultantUser = await userRepo.findOne({
    where: { email: CONSULTANT_USER.email },
    relations: { roles: true },
  });

  if (!consultantUser) {
    consultantUser = userRepo.create({
      email: CONSULTANT_USER.email,
      phone: CONSULTANT_USER.phone,
      passwordHash: await hasher.hash(CONSULTANT_USER.password),
      accountStatus: AccountStatus.Active,
      userType: UserType.Admin,
      isPhoneVerified: true,
      failedLoginAttempts: 0,
      roles: [adminRole],
    });
    await userRepo.save(consultantUser);
    logger.LogInfo('Consultant user created');
  } else {
    consultantUser.phone = CONSULTANT_USER.phone;
    consultantUser.accountStatus = AccountStatus.Active;
    consultantUser.userType = UserType.Admin;
    consultantUser.isPhoneVerified = true;
    consultantUser.failedLoginAttempts = 0;

    const hasAdminRole = consultantUser.roles?.some(
      (role) => role.name === Role.ADMIN,
    );
    if (!hasAdminRole) {
      consultantUser.roles = [...(consultantUser.roles ?? []), adminRole];
    }

    await userRepo.save(consultantUser);
    logger.LogInfo('Consultant user updated');
  }

  let consultantProfile = await profileRepo.findOne({
    where: { userId: consultantUser.id },
  });

  if (!consultantProfile) {
    consultantProfile = profileRepo.create({
      userId: consultantUser.id,
      ...CONSULTANT_PROFILE,
    });
    await profileRepo.save(consultantProfile);
    logger.LogInfo('Consultant profile created');
  } else {
    Object.assign(consultantProfile, CONSULTANT_PROFILE);
    await profileRepo.save(consultantProfile);
    logger.LogInfo('Consultant profile updated');
  }

  for (const certSeed of CONSULTANT_CERTIFICATIONS) {
    let certification = await certRepo.findOne({
      where: {
        consultantProfileId: consultantProfile.id,
        certificateId: certSeed.certificateId,
      },
    });

    if (!certification) {
      certification = certRepo.create({
        consultantProfileId: consultantProfile.id,
        ...certSeed,
      });
      await certRepo.save(certification);
      logger.LogInfo(
        `Consultant certification created (${certSeed.certificateId})`,
      );
    } else {
      Object.assign(certification, certSeed);
      await certRepo.save(certification);
      logger.LogInfo(
        `Consultant certification updated (${certSeed.certificateId})`,
      );
    }
  }

  await app.close();
}

bootstrap();
