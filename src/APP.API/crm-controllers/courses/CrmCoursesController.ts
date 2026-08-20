import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/courses/swagger.doc';
import { CrmCourseDetailsService } from '@bll/crm-services/courses/CrmCourseDetailsService';
import { CrmCourseUpdateService } from '@bll/crm-services/courses/CrmCourseUpdateService';
import { CrmCourseDetailsResponseDto } from '@shared/dtos/crm/courses/CrmCourseDetailsResponseDto';
import { UpdateCrmCourseRequestDto } from '@shared/dtos/crm/courses/UpdateCrmCourseRequestDto';
import { UpdateCrmCourseResponseDto } from '@shared/dtos/crm/courses/UpdateCrmCourseResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Courses')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  CrmCourseDetailsResponseDto,
  UpdateCrmCourseRequestDto,
  UpdateCrmCourseResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/courses')
export class CrmCoursesController {
  constructor(
    private readonly courseDetailsService: CrmCourseDetailsService,
    private readonly courseUpdateService: CrmCourseUpdateService,
  ) {}

  @Get(':courseId')
  @AddSwaggerDoc('crmCourses', 'getCourseDetails')
  async getCourseDetails(
    @CurrentUser() _user: ICurrentUser,
    @Param('courseId', ParseUUIDPipe) courseIntakeId: string,
  ): Promise<CrmCourseDetailsResponseDto> {
    return this.courseDetailsService.getCourseDetails(courseIntakeId);
  }

  @Patch(':courseId')
  @RequireRole(Role.ADMIN)
  @AddSwaggerDoc('crmCourses', 'updateCourse')
  async updateCourse(
    @CurrentUser() _user: ICurrentUser,
    @Param('courseId', ParseUUIDPipe) courseIntakeId: string,
    @Body() dto: UpdateCrmCourseRequestDto,
  ): Promise<UpdateCrmCourseResponseDto> {
    return this.courseUpdateService.updateCourse(courseIntakeId, dto);
  }
}
