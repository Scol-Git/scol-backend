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
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import '../common/swagger/applications/swagger.doc';
import { CrmApplicationNoteService } from '@bll/crm-services/applications/CrmApplicationNoteService';
import { CreateCrmApplicationNoteRequestDto } from '@shared/dtos/applications/CreateCrmApplicationNoteRequestDto';
import { CreateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/CreateCrmApplicationNoteResponseDto';
import { DeleteCrmApplicationNoteResponseDto } from '@shared/dtos/applications/DeleteCrmApplicationNoteResponseDto';
import { GetCrmApplicationNotesResponseDto } from '@shared/dtos/applications/GetCrmApplicationNotesResponseDto';
import { UpdateCrmApplicationNoteRequestDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteRequestDto';
import { UpdateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { Role } from '@shared/enums/Role.enum';
import type { ICurrentUser } from '@shared/interfaces/domain';

@ApiTags('CRM Application Notes')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  SuccessResponseDto,
  ErrorResponseDto,
  GetCrmApplicationNotesResponseDto,
  CreateCrmApplicationNoteResponseDto,
  UpdateCrmApplicationNoteResponseDto,
  DeleteCrmApplicationNoteResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN, Role.COUNSELLOR)
@Controller('crm/leads/:leadId/applications/:applicationId/notes')
export class CrmApplicationNotesController {
  constructor(
    private readonly crmApplicationNoteService: CrmApplicationNoteService,
  ) {}

  @Get()
  @AddSwaggerDoc('crmApplicationNotes', 'getApplicationNotes')
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
  @AddSwaggerDoc('crmApplicationNotes', 'createApplicationNote')
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
  @AddSwaggerDoc('crmApplicationNotes', 'updateApplicationNote')
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
  @AddSwaggerDoc('crmApplicationNotes', 'deleteApplicationNote')
  async deleteApplicationNote(
    @CurrentUser() user: ICurrentUser,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ): Promise<DeleteCrmApplicationNoteResponseDto> {
    return this.crmApplicationNoteService.deleteNote(
      user.userId,
      leadId,
      applicationId,
      noteId,
    );
  }
}
