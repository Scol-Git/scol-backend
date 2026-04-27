import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { ApplicationCreationService } from '@bll/services/applications/ApplicationCreationService';
import { ApplicationQueryService } from '@bll/services/applications/ApplicationQueryService';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@shared/enums/Role.enum';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';

@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.LEAD)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationCreationService: ApplicationCreationService,
    private readonly applicationQueryService: ApplicationQueryService,
  ) {}

  @Get()
  async getLeadApplications(
    @CurrentUser() user: ICurrentUser,
  ): Promise<GetApplicationsResponseDto> {
    return this.applicationQueryService.getLeadApplications(user.userId);
  }

  @Get(':applicationId/stage-progress')
  async getApplicationStageProgress(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetApplicationStageProgressResponseDto> {
    return await this.applicationQueryService.getApplicationStageProgress(
      user.userId,
      applicationId,
    );
  }

  @Get(':applicationId/document-progress')
  async getApplicationDocumentProgress(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetApplicationDocumentProgressResponseDto> {
    return await this.applicationQueryService.getApplicationDocumentProgress(
      user.userId,
      applicationId,
    );
  }

  @Get(':applicationId')
  async getApplicationById(
    @CurrentUser() user: ICurrentUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetApplicationDetailsResponseDto> {
    return await this.applicationQueryService.getApplicationDetails(
      user.userId,
      applicationId,
    );
  }

  @Post()
  async createApplication(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    return this.applicationCreationService.createApplication(user.userId, dto);
  }
}
