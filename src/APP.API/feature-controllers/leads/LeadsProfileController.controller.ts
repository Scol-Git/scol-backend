import { Controller, Get, Put, Body, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
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
import { AcademicResultItemDto } from '@shared/dtos/leads/AcademicResultItemDto';
import { EnglishTestResultItemDto } from '@shared/dtos/leads/EnglishTestResultItemDto';
import { EnglishTestSectionItemDto } from '@shared/dtos/leads/EnglishTestSectionItemDto';
import { PreferredCountryItemDto } from '@shared/dtos/leads/PreferredCountryItemDto';
import { PreferredProgrammeItemDto } from '@shared/dtos/leads/PreferredProgrammeItemDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';

/**
 * Leads Profile Controller
 *
 * Handles lead profile endpoints:
 * - GET /leads/profile/academic-form - Get academic form (academicResults always 4 items, englishTestResults all system tests, preferredCountries/preferredProgrammes full lists with selected)
 * - PUT /leads/profile/academic-form - Save academic form data (Option A: all four required)
 */
@ApiTags('leads')
@ApiExtraModels(
  AcademicFormResponseDto,
  AcademicFormRequestDto,
  AcademicResultItemDto,
  EnglishTestResultItemDto,
  EnglishTestSectionItemDto,
  PreferredCountryItemDto,
  PreferredProgrammeItemDto,
)
@Controller('leads/profile')
export class LeadsProfileController {
  constructor(private readonly leadProfileService: LeadProfileService) {}

  /**
   * GET: Full Lead Profile (UI profile page)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getLeadProfile(@CurrentUser() user: ICurrentUser) {
    return this.leadProfileService.getLeadProfile(user.userId);
  }

  /**
   * Get academic form data
   * GET /leads/profile/academic-form
   *
   * academicResults: always 4 items (SSC, HSC, BSC, Master) with degreeId, degreeName, gpa/institute/passingDate (null when not filled), isEditable (true when no valid GPA yet).
   * englishTestResults: one per system English test with testId, testName, overallScore/testDate, sections (id, name, score), isEditable (false only when overall and all section scores are set and non-zero).
   * preferredCountries: all system countries with id, name, selected (never null).
   * preferredProgrammes: all system programmes with id, name, selected (never null).
   * lastAcademicInstitute: derived from highest levelOrder valid degree's institute (null if none).
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
   * Option A: Every PUT must include at least one valid gpa + lastAcademicInstitute (non-empty) + preferredCountryIds (non-empty, max 3) + preferredProgrammeIds (non-empty, max 3).
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

  /**
   * GET /leads/profile/leads/documents/:documentId/download
   * Signed URL for the authenticated lead to download their document.
   */
  @Get('leads/documents/:documentId/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async downloadLeadDocument(
    @CurrentUser() user: ICurrentUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    return this.leadProfileService.generateLeadDocumentDownloadUrl(
      user.userId,
      documentId,
    );
  }
}
