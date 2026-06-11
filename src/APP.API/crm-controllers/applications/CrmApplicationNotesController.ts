import {
  Body,
  Controller,
  Delete,
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
import { CrmApplicationNoteService } from '@bll/crm-services/applications/CrmApplicationNoteService';
import { CreateCrmApplicationNoteRequestDto } from '@shared/dtos/applications/CreateCrmApplicationNoteRequestDto';
import { CreateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/CreateCrmApplicationNoteResponseDto';
import { GetCrmApplicationNotesResponseDto } from '@shared/dtos/applications/GetCrmApplicationNotesResponseDto';
import { UpdateCrmApplicationNoteRequestDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteRequestDto';
import { UpdateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Application Notes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads/:leadId/applications/:applicationId/notes')
export class CrmApplicationNotesController {
  constructor(
    private readonly crmApplicationNoteService: CrmApplicationNoteService,
  ) {}

  @Get()
  async getApplicationNotes(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<GetCrmApplicationNotesResponseDto> {
    return this.crmApplicationNoteService.getNotes(
      user.userId,
      leadId,
      applicationId,
    );
  }

  @Post()
  async createApplicationNote(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: CreateCrmApplicationNoteRequestDto,
  ): Promise<CreateCrmApplicationNoteResponseDto> {
    return this.crmApplicationNoteService.createNote(
      user.userId,
      leadId,
      applicationId,
      dto,
    );
  }

  @Put(':noteId')
  async updateApplicationNote(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() dto: UpdateCrmApplicationNoteRequestDto,
  ): Promise<UpdateCrmApplicationNoteResponseDto> {
    return this.crmApplicationNoteService.updateNote(
      user.userId,
      leadId,
      applicationId,
      noteId,
      dto,
    );
  }

  @Delete(':noteId')
  async deleteApplicationNote(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ): Promise<{ success: true }> {
    return this.crmApplicationNoteService.deleteNote(
      user.userId,
      leadId,
      applicationId,
      noteId,
    );
  }
}
