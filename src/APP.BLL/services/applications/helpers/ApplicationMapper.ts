import { Injectable } from '@nestjs/common';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';

@Injectable()
export class ApplicationMapper {
  toCreateApplicationResponse(
    applicationId: string,
  ): CreateApplicationResponseDto {
    return {
      success: true,
      applicationId,
    };
  }
}

