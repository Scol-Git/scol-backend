import { Injectable } from '@nestjs/common';
import { ApplicationNotes } from '@entity/entities/ApplicationNotes.entity';
import { CrmApplicationNoteAuthorDto } from '@shared/dtos/applications/CrmApplicationNoteAuthorDto';
import { CrmApplicationNoteItemDto } from '@shared/dtos/applications/CrmApplicationNoteItemDto';
import { GetCrmApplicationNotesResponseDto } from '@shared/dtos/applications/GetCrmApplicationNotesResponseDto';

@Injectable()
export class CrmApplicationNoteMapper {
  toGetCrmApplicationNotesResponse(
    applicationId: string,
    notes: ApplicationNotes[],
    authorDisplayNamesByUserId: ReadonlyMap<string, string | null>,
  ): GetCrmApplicationNotesResponseDto {
    return {
      applicationId,
      notes: notes.map((note) =>
        this.toCrmApplicationNoteItem(note, authorDisplayNamesByUserId),
      ),
    };
  }

  toCrmApplicationNoteItem(
    note: ApplicationNotes,
    authorDisplayNamesByUserId: ReadonlyMap<string, string | null>,
  ): CrmApplicationNoteItemDto {
    return {
      noteId: note.id,
      applicationId: note.applicationId,
      description: note.description,
      isResolved: note.isResolved,
      resolvedAt: note.resolvedAt ? note.resolvedAt.toISOString() : null,
      resolvedBy: this.toAuthorDto(
        note.resolvedByUserId,
        authorDisplayNamesByUserId,
      ),
      createdBy: this.toAuthorDto(
        note.createdByUserId,
        authorDisplayNamesByUserId,
      ),
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private toAuthorDto(
    userId: string | null | undefined,
    authorDisplayNamesByUserId: ReadonlyMap<string, string | null>,
  ): CrmApplicationNoteAuthorDto | null {
    if (!userId) {
      return null;
    }

    return {
      userId,
      displayName: authorDisplayNamesByUserId.get(userId) ?? null,
    };
  }
}
