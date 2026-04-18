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

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationCreationService: ApplicationCreationService,
    private readonly applicationQueryService: ApplicationQueryService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
  async getLeadApplications(
    @CurrentUser() user: ICurrentUser,
  ): Promise<GetApplicationsResponseDto> {
    return this.applicationQueryService.getLeadApplications(user.userId);
  }

  @Get(':applicationId/stage-progress')
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
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
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
  async createApplication(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    return this.applicationCreationService.createApplication(user.userId, dto);
  }
}
