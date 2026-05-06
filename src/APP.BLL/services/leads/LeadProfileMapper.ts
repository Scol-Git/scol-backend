import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import {
  AcademicRecordItemDto,
  LeadProfileResponseDto,
} from '@shared/dtos/leads/LeadProfileResponseDto';
import { LeadDocuments } from '../../../APP.Entity/entities/LeadDocuments.entity';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';

export class LeadProfileMapper {
  static toResponse(profile: SysLeadProfiles): LeadProfileResponseDto {
    return {
      personalInformation: {
        sectionTitle: 'Personal Information',
        isEditable: false,

        joined: profile.createdAt?.getFullYear()?.toString(),
        img_url: profile.imgUrl || null,

        fields: [
          { label: 'Full Name', value: profile.fullName },
          { label: 'Date Of Birth', value: profile.dob },
          { label: 'Gender', value: profile.gender },
        ],
      },

      academicBackground: {
        sectionTitle: 'Academic Background',
        isEditable: true,
        fields:
          profile.LeadAcademicResult?.map((academic) => ({
            label: academic.SysAcademicDegree?.degreeName || 'Degree',
            value: academic.gpa,
          })) || [],
      },

      englishTestScore: {
        sectionTitle: 'English Test Score',
        isEditable: true,
        fields:
          profile.LeadEnglishTestResult?.map((test) => ({
            // id: test.sysEngTestId,
            label: test.SysEnglishTest?.testName || 'Test',
            value: test.overallScore,
          })) || [],
      },

      contactInformation: {
        sectionTitle: 'Contact Information',
        isEditable: false,
        fields: [
          {
            id: 'phone',
            label: 'Phone',
            value: profile.SysUser?.phone || null,
          },
        ],
      },

      academicRecord: {
        sectionTitle: 'Academic Records',
        isEditable: false,
        items: this.buildAcademicRecords(profile.LeadDocuments),
      },
    };
  }

  private static buildAcademicRecords(
    docs: LeadDocuments[] = [],
  ): AcademicRecordItemDto[] {
    const grouped: Record<string, AcademicRecordItemDto> = {};

    const allowedStatuses = new Set([
      ApplicationDocumentStatus.InProgress,
      ApplicationDocumentStatus.Verified,
    ]);

    for (const doc of docs) {
      const typeId = doc.sysDocumentTypeId;

      // 1. Create group if not exists
      if (!grouped[typeId]) {
        grouped[typeId] = {
          documentType: {
            documentTypeId: typeId,
            documentTypeCode: doc.SysDocumentType?.documentTypeCode ?? '',
            documentTypeName: doc.SysDocumentType?.documentTypeName ?? '',
          },
          uploadedDocuments: [],
        };
      }

      // 2. Skip invalid documents early
      if (!allowedStatuses.has(doc.overallStatus!)) continue;

      // 3. Push valid document
      grouped[typeId].uploadedDocuments.push({
        documentId: doc.id,
        fileName: doc.latestFileName,
        overallStatus: doc.overallStatus!,
      });
    }

    return Object.values(grouped);
  }
}
