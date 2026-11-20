import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/lookups/swagger.doc';
import { CrmLookupsService } from '@bll/crm-services/lookups/CrmLookupsService';
import { CrmAcademicDegreesResponseDto } from '@shared/dtos/crm/lookups/CrmAcademicDegreesResponseDto';
import {
  CrmCitiesResponseDto,
  CrmCountriesResponseDto,
  CrmStatesResponseDto,
} from '@shared/dtos/crm/lookups/CrmGeoLookupResponseDto';
import { CrmProgrammesResponseDto } from '@shared/dtos/crm/lookups/CrmProgrammesResponseDto';
import { CrmCitiesQueryDto, CrmStatesQueryDto } from '@shared/dtos/crm/lookups/CrmGeoLookupQueryDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';

@ApiTags('CRM Lookups')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  CrmAcademicDegreesResponseDto,
  CrmCountriesResponseDto,
  CrmStatesResponseDto,
  CrmCitiesResponseDto,
  CrmProgrammesResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/lookups')
export class CrmLookupsController {
  constructor(private readonly lookupsService: CrmLookupsService) {}

  @Get('academic-degrees')
  @AddSwaggerDoc('crmLookups', 'listAcademicDegrees')
  async listAcademicDegrees(): Promise<CrmAcademicDegreesResponseDto> {
    return this.lookupsService.listAcademicDegrees();
  }

  @Get('programmes')
  @AddSwaggerDoc('crmLookups', 'listProgrammes')
  async listProgrammes(): Promise<CrmProgrammesResponseDto> {
    return this.lookupsService.listProgrammes();
  }

  @Get('countries')
  @AddSwaggerDoc('crmLookups', 'listCountries')
  async listCountries(): Promise<CrmCountriesResponseDto> {
    return this.lookupsService.listCountries();
  }

  @Get('states')
  @AddSwaggerDoc('crmLookups', 'listStates')
  async listStates(@Query() query: CrmStatesQueryDto): Promise<CrmStatesResponseDto> {
    return this.lookupsService.listStates(query.countryId);
  }

  @Get('cities')
  @AddSwaggerDoc('crmLookups', 'listCities')
  async listCities(@Query() query: CrmCitiesQueryDto): Promise<CrmCitiesResponseDto> {
    return this.lookupsService.listCities(query.stateId);
  }
}
