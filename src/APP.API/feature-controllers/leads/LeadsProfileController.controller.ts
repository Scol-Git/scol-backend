import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiExtraModels } from '@nestjs/swagger';

// Guards
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';

// Decorators
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';

// Types
import type { ICurrentUser } from '@shared/interfaces/domain';

// Services
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';

// DTOs
import { AcademicFormResponseDto } from '@shared/dtos/leads/AcademicFormResponseDto';
import { AcademicFormRequestDto } from '@shared/dtos/leads/AcademicFormRequestDto';
import { DegreeResponseDto } from '@shared/dtos/leads/DegreeResponseDto';
import { EnglishTestResponseDto } from '@shared/dtos/leads/EnglishTestResponseDto';
import { SelectableItemDto } from '@shared/dtos/leads/SelectableItemDto';

/**
 * Leads Profile Controller
 *
 * Handles lead profile endpoints:
 * - GET /leads/profile/academic-form - Get academic form data
 * - PUT /leads/profile/academic-form - Save academic form data
 */
@ApiTags('leads')
@ApiExtraModels(
  AcademicFormResponseDto,
  AcademicFormRequestDto,
  DegreeResponseDto,
  EnglishTestResponseDto,
  SelectableItemDto,
)
@Controller('leads/profile')
export class LeadsProfileController {
  constructor(private readonly leadProfileService: LeadProfileService) {}

  /**
   * Get academic form data
   * GET /leads/profile/academic-form
   *
   * Returns all form fields with:
   * - User's saved values
   * - Validation rules (GPA scale, max scores, etc.)
   * - Available options (countries, programmes)
   */
  @Get('academic-form')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getAcademicForm(
    @CurrentUser() user: ICurrentUser,
  ): Promise<AcademicFormResponseDto> {
    return this.leadProfileService.getAcademicForm(user.userId);
  }

  /**
   * Save academic form data
   * PUT /leads/profile/academic-form
   *
   * Single transactional write for the entire form.
   * Replaces all existing data with new values.
   * Returns the updated form data (same response as GET).
   */
  @Put('academic-form')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async updateAcademicForm(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AcademicFormRequestDto,
  ): Promise<AcademicFormResponseDto> {
    return this.leadProfileService.updateAcademicForm(user.userId, dto);
  }
}
