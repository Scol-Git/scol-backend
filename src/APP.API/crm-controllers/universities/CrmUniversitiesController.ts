import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/universities/swagger.doc';
import { CrmUniversityDetailsService } from '@bll/crm-services/universities/CrmUniversityDetailsService';
import { CrmUniversityUpdateService } from '@bll/crm-services/universities/CrmUniversityUpdateService';
import { CrmUniversityStageFlowService } from '@bll/crm-services/universities/CrmUniversityStageFlowService';
import {
  ActiveIntakeItemDto,
  ActiveIntakesDto,
  CommissionDto,
  CrmStageFlowItemDto,
  CrmStageRequiredDocumentDto,
  CrmUniversityDetailsResponseDto,
  CrmUniversityInfoDto,
} from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';
import { UpdateCrmUniversityRequestDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityRequestDto';
import { UpdateCrmUniversityResponseDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityResponseDto';
import { UpdateCrmUniversityStageFlowRequestDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityStageFlowRequestDto';
import { CrmUniversityStageFlowResponseDto } from '@shared/dtos/crm/universities/CrmUniversityStageFlowResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Universities')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  CrmUniversityDetailsResponseDto,
  CrmUniversityInfoDto,
  ActiveIntakesDto,
  ActiveIntakeItemDto,
  CommissionDto,
  CrmStageFlowItemDto,
  CrmStageRequiredDocumentDto,
  UpdateCrmUniversityRequestDto,
  UpdateCrmUniversityResponseDto,
  UpdateCrmUniversityStageFlowRequestDto,
  CrmUniversityStageFlowResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/universities')
export class CrmUniversitiesController {
  constructor(
    private readonly detailsService: CrmUniversityDetailsService,
    private readonly updateService: CrmUniversityUpdateService,
    private readonly stageFlowService: CrmUniversityStageFlowService,
  ) {}

  @Get(':uniId')
  @AddSwaggerDoc('crmUniversities', 'getUniversityDetails')
  async getUniversityDetails(
    @CurrentUser() _user: ICurrentUser,
    @Param('uniId', ParseUUIDPipe) uniId: string,
  ): Promise<CrmUniversityDetailsResponseDto> {
    return this.detailsService.getUniversityDetails(uniId);
  }

  @Patch(':uniId')
  @RequireRole(Role.ADMIN)
  @AddSwaggerDoc('crmUniversities', 'updateUniversity')
  async updateUniversity(
    @CurrentUser() _user: ICurrentUser,
    @Param('uniId', ParseUUIDPipe) uniId: string,
    @Body() dto: UpdateCrmUniversityRequestDto,
  ): Promise<UpdateCrmUniversityResponseDto> {
    return this.updateService.updateUniversity(uniId, dto);
  }

  @Put(':uniId/application-stage-flow')
  @RequireRole(Role.ADMIN)
  @AddSwaggerDoc('crmUniversities', 'replaceApplicationStageFlow')
  async replaceApplicationStageFlow(
    @CurrentUser() _user: ICurrentUser,
    @Param('uniId', ParseUUIDPipe) uniId: string,
    @Body() dto: UpdateCrmUniversityStageFlowRequestDto,
  ): Promise<CrmUniversityStageFlowResponseDto> {
    return this.stageFlowService.replaceFlow(uniId, dto);
  }
}
