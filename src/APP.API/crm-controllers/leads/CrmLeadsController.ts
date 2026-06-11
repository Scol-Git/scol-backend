import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { CrmLeadQueryService } from '@bll/crm-services/leads/CrmLeadQueryService';
import { CrmLeadService } from '@bll/crm-services/leads/CrmLeadService';
import { CreateCrmLeadRequestDto } from '@shared/dtos/crm/leads/CreateCrmLeadRequestDto';
import { CreateCrmLeadResponseDto } from '@shared/dtos/crm/leads/CreateCrmLeadResponseDto';
import { CrmLeadDropdownDataResponseDto } from '@shared/dtos/crm/leads/CrmLeadDropdownDataResponseDto';
import { CrmLeadListRequestDto } from '@shared/dtos/crm/leads/CrmLeadListRequestDto';
import { CrmLeadListResponseDto } from '@shared/dtos/crm/leads/CrmLeadListResponseDto';
import { UpdateCrmLeadRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadRequestDto';
import { UpdateCrmLeadResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Leads')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads')
export class CrmLeadsController {
  constructor(
    private readonly crmLeadService: CrmLeadService,
    private readonly crmLeadQueryService: CrmLeadQueryService,
  ) {}

  

  @Post()
  async createLead(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateCrmLeadRequestDto,
  ): Promise<CreateCrmLeadResponseDto> {
    return this.crmLeadService.createLead(user.userId, dto);
  }

  @Put(':leadId')
  async updateLead(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: UpdateCrmLeadRequestDto,
  ): Promise<UpdateCrmLeadResponseDto> {
    return this.crmLeadService.updateLead(user.userId, leadId, dto);
  }


  @Post('list')
  async getLeadList(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CrmLeadListRequestDto,
  ): Promise<CrmLeadListResponseDto> {
    return this.crmLeadQueryService.getLeadList(user.userId, dto);
  }

  @Get('dropdown-data')
  async getDropdownData(): Promise<CrmLeadDropdownDataResponseDto> {
    return this.crmLeadQueryService.getDropdownData();
  }
}
