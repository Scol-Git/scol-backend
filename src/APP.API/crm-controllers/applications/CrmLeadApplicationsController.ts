import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { CrmApplicationCreationService } from '@bll/crm-services/applications/CrmApplicationCreationService';
import { CrmApplicationQueryService } from '@bll/crm-services/applications/CrmApplicationQueryService';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Applications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads/:leadId/applications')
export class CrmLeadApplicationsController {
  constructor(
    private readonly crmApplicationCreation: CrmApplicationCreationService,
    private readonly crmApplicationQuery: CrmApplicationQueryService,
  ) {}

  @Post()
  async createApplicationForLead(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    return this.crmApplicationCreation.createApplicationForLead(
      user.userId,
      leadId,
      dto,
    );
  }

  @Get()
  async getApplicationsForLead(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ): Promise<GetApplicationsResponseDto> {
    return this.crmApplicationQuery.getApplicationsForLead(user.userId, leadId);
  }

  @Get(':applicationId/stage-progress')
  async getApplicationStageProgress(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetApplicationStageProgressResponseDto> {
    return this.crmApplicationQuery.getApplicationStageProgress(
      user.userId,
      leadId,
      applicationId,
    );
  }

  @Get(':applicationId/document-progress')
  async getApplicationDocumentProgress(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetApplicationDocumentProgressResponseDto> {
    return this.crmApplicationQuery.getApplicationDocumentProgress(
      user.userId,
      leadId,
      applicationId,
    );
  }

  @Get(':applicationId')
  async getApplicationById(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetApplicationDetailsResponseDto> {
    return await this.crmApplicationQuery.getApplicationDetails(
      user.userId,
      leadId,
      applicationId,
    );
  }
}
