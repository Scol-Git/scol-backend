import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { EntityManager } from 'typeorm';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { Applications } from '@entity/entities/Applications.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { SysApplicationStatus } from '@entity/entities/SysApplicationStatus.entity';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { ApplicationValidator } from './helpers/ApplicationValidator';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationSerialNumberService } from './helpers/ApplicationSerialNumberService';
import { ApplicationRequirementResolver } from './helpers/ApplicationRequirementResolver';
import { ApplicationActivityService } from './helpers/ApplicationActivityService';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { ApplicationStage } from '@shared/enums/ApplicationStage.enum';
import { ApplicationStatus } from '@shared/enums/ApplicationStatus.enum';

@Injectable()
export class ApplicationCreationService {
  constructor(
    private readonly db: AppDbContext,
    private readonly mapper: ApplicationMapper,
    private readonly validator: ApplicationValidator,
    private readonly accessService: ApplicationAccessService,
    private readonly serialNumberService: ApplicationSerialNumberService,
    private readonly requirementResolver: ApplicationRequirementResolver,
    private readonly activityService: ApplicationActivityService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async createApplication(
    currentUserId: string,
    dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    await this.validator.validateCreateApplicationRequest(dto);

    const leadProfile =
      await this.accessService.ensureLeadProfileExistsOrThrow(currentUserId);

    const courseIntake = await this.resolveCourseIntakeOrThrow(dto);
    const countryId = courseIntake.UniCourse?.SysUniversity?.sysCountryId;
    if (!countryId) {
      throw new ValidationException(
        'Unable to resolve country for selected intake',
      );
    }

    const initialStage = await this.resolveInitialStageOrThrow();
    const initialStatus = await this.resolveInitialStatusOrThrow();

    const serialNumber =
      await this.serialNumberService.generateNextSerialNumber(
        dto.intake.intakeMonth,
        dto.intake.intakeYear,
        countryId,
      );

    const application = await this.db.transaction((manager) =>
      this.createApplicationInTransaction(
        manager,
        leadProfile.id,
        courseIntake.id,
        countryId,
        initialStage.id,
        initialStatus.id,
        serialNumber,
        currentUserId,
      ),
    );

    this.logger.info('Application created successfully', {
      context: 'ApplicationCreationService.createApplication',
      applicationId: application.id,
      userId: currentUserId,
      courseIntakeId: courseIntake.id,
    });

    return this.mapper.toCreateApplicationResponse(application.id);
  }

  private async resolveCourseIntakeOrThrow(
    dto: CreateApplicationRequestDto,
  ): Promise<UniCourseIntakes> {
    const intake = await this.db.courseIntakes
      .createQueryBuilder('intake')
      .innerJoinAndSelect('intake.UniCourse', 'course')
      .innerJoinAndSelect('course.SysUniversity', 'university')
      .where('intake.uniCourseId = :courseId', { courseId: dto.courseId })
      .andWhere('intake.intakeMonth = :intakeMonth', {
        intakeMonth: dto.intake.intakeMonth,
      })
      .andWhere('intake.intakeYear = :intakeYear', {
        intakeYear: dto.intake.intakeYear,
      })
      .andWhere('course.uniId = :universityId', {
        universityId: dto.universityId,
      })
      .andWhere('intake.isActive = true')
      .andWhere('intake.deletedAt IS NULL')
      .getOneOrFail();

    if (!intake) {
      throw new NotFoundException(
        'No course intake found for the provided university, course, and intake',
      );
    }

    return intake;
  }

  private async resolveInitialStageOrThrow(): Promise<SysApplicationStage> {
    const stage = await this.db.applicationStages.findOne({
      where: { stageCode: ApplicationStage.Review },
    });

    if (!stage) {
      throw new NotFoundException(
        `Initial application stage ${ApplicationStage.Review} not found`,
      );
    }

    return stage;
  }

  private async resolveInitialStatusOrThrow(): Promise<SysApplicationStatus> {
    const status = await this.db.applicationStatuses.findOne({
      where: { statusCode: ApplicationStatus.InProgress },
    });

    if (!status) {
      throw new NotFoundException(
        `Initial application status ${ApplicationStatus.InProgress} not found`,
      );
    }

    return status;
  }

  private async createApplicationInTransaction(
    manager: EntityManager,
    leadId: string,
    courseIntakeId: string,
    countryId: string,
    stageId: string,
    statusId: string,
    serialNumber: string,
    actedByUserId: string,
  ): Promise<Applications> {
    const applicationsRepository = manager.getRepository(Applications);

    //Todo : Assign to userId
    const application = await applicationsRepository.save(
      applicationsRepository.create({
        leadId,
        courseIntakeId,
        currentSysApplicationStageId: stageId,
        currentSysApplicationStatusId: statusId,
        serialNumber,
      }),
    );

    await this.requirementResolver.generateSnapshotForApplication(
      manager,
      application.id,
      countryId,
    );

    await this.activityService.logApplicationCreated(manager, {
      applicationId: application.id,
      actedByUserId,
    });

    return application;
  }
}
