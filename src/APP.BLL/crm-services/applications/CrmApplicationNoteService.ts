import { Injectable, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApplicationNotes } from '@entity/entities/ApplicationNotes.entity';
import { CreateCrmApplicationNoteRequestDto } from '@shared/dtos/applications/CreateCrmApplicationNoteRequestDto';
import { CreateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/CreateCrmApplicationNoteResponseDto';
import { DeleteCrmApplicationNoteResponseDto } from '@shared/dtos/applications/DeleteCrmApplicationNoteResponseDto';
import { GetCrmApplicationNotesResponseDto } from '@shared/dtos/applications/GetCrmApplicationNotesResponseDto';
import { UpdateCrmApplicationNoteRequestDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteRequestDto';
import { UpdateCrmApplicationNoteResponseDto } from '@shared/dtos/applications/UpdateCrmApplicationNoteResponseDto';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationNoteMapper } from './helpers/CrmApplicationNoteMapper';

@Injectable()
export class CrmApplicationNoteService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmApplicationAccessService,
    private readonly noteMapper: CrmApplicationNoteMapper,
  ) {}

  async getNotes(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetCrmApplicationNotesResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    const notes = await this.db.applicationNotes.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    const authorDisplayNamesByUserId =
      await this.loadAuthorDisplayNamesByUserIds(
        this.collectAuthorUserIds(notes),
      );

    return this.noteMapper.toGetCrmApplicationNotesResponse(
      application.id,
      notes,
      authorDisplayNamesByUserId,
    );
  }

  async createNote(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    dto: CreateCrmApplicationNoteRequestDto,
  ): Promise<CreateCrmApplicationNoteResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    const isResolved = dto.isResolved ?? false;
    const resolvedFields = this.resolveStatusFields(
      isResolved,
      currentUserId,
      false,
    );

    const note = await this.db.applicationNotes.save({
      applicationId: application.id,
      description: dto.description.trim(),
      isResolved,
      createdByUserId: currentUserId,
      updatedByUserId: currentUserId,
      ...resolvedFields,
    });

    const authorDisplayNamesByUserId =
      await this.loadAuthorDisplayNamesByUserIds(
        this.collectAuthorUserIds([note]),
      );

    return {
      note: this.noteMapper.toCrmApplicationNoteItem(
        note,
        authorDisplayNamesByUserId,
      ),
    };
  }

  async updateNote(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    noteId: string,
    dto: UpdateCrmApplicationNoteRequestDto,
  ): Promise<UpdateCrmApplicationNoteResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    if (dto.description === undefined && dto.isResolved === undefined) {
      throw new ValidationException('At least one field must be provided', {
        description: ['Provide description or isResolved'],
        isResolved: ['Provide description or isResolved'],
      });
    }

    const note = await this.loadNoteForApplicationOrThrow(
      noteId,
      application.id,
    );

    if (dto.description !== undefined) {
      const trimmedDescription = dto.description.trim();
      if (trimmedDescription.length === 0) {
        throw new ValidationException('Description cannot be empty', {
          description: ['Description cannot be empty'],
        });
      }

      note.description = trimmedDescription;
    }

    if (dto.isResolved !== undefined) {
      const wasResolved = note.isResolved;
      note.isResolved = dto.isResolved;

      if (dto.isResolved) {
        if (!wasResolved || !note.resolvedAt) {
          note.resolvedAt = new Date();
          note.resolvedByUserId = currentUserId;
        }
      } else {
        note.resolvedAt = null;
        note.resolvedByUserId = null;
      }
    }

    note.updatedByUserId = currentUserId;

    const savedNote = await this.db.applicationNotes.save(note);

    const authorDisplayNamesByUserId =
      await this.loadAuthorDisplayNamesByUserIds(
        this.collectAuthorUserIds([savedNote]),
      );

    return {
      note: this.noteMapper.toCrmApplicationNoteItem(
        savedNote,
        authorDisplayNamesByUserId,
      ),
    };
  }

  async deleteNote(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    noteId: string,
  ): Promise<DeleteCrmApplicationNoteResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    await this.loadNoteForApplicationOrThrow(noteId, application.id);
    await this.db.applicationNotes.softDelete({ id: noteId });

    return { success: true };
  }

  private async loadNoteForApplicationOrThrow(
    noteId: string,
    applicationId: string,
  ): Promise<ApplicationNotes> {
    const note = await this.db.applicationNotes.findOne({
      where: {
        id: noteId,
        applicationId,
      },
    });

    if (!note) {
      throw new NotFoundException('Application note not found');
    }

    return note;
  }

  private resolveStatusFields(
    isResolved: boolean,
    currentUserId: string,
    previousIsResolved: boolean,
  ): Pick<ApplicationNotes, 'resolvedAt' | 'resolvedByUserId'> {
    if (isResolved) {
      if (!previousIsResolved) {
        return {
          resolvedAt: new Date(),
          resolvedByUserId: currentUserId,
        };
      }

      return {
        resolvedAt: undefined,
        resolvedByUserId: undefined,
      };
    }

    return {
      resolvedAt: null,
      resolvedByUserId: null,
    };
  }

  private collectAuthorUserIds(notes: ApplicationNotes[]): string[] {
    return [
      ...new Set(
        notes
          .flatMap((note) => [note.createdByUserId, note.resolvedByUserId])
          .filter((userId): userId is string => userId != null),
      ),
    ];
  }

  private async loadAuthorDisplayNamesByUserIds(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    const displayNamesByUserId = new Map<string, string | null>();

    if (userIds.length === 0) {
      return displayNamesByUserId;
    }

    const [consultantProfiles, leadProfiles] = await Promise.all([
      this.db.consultantProfiles.find({
        where: { userId: In(userIds) },
        select: ['userId', 'fullName'],
      }),
      this.db.leadProfiles.find({
        where: { userId: In(userIds) },
        select: ['userId', 'fullName'],
      }),
    ]);

    for (const profile of consultantProfiles) {
      displayNamesByUserId.set(profile.userId, profile.fullName);
    }

    for (const profile of leadProfiles) {
      if (!displayNamesByUserId.has(profile.userId)) {
        displayNamesByUserId.set(profile.userId, profile.fullName);
      }
    }

    return displayNamesByUserId;
  }
}
