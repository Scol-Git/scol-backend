//  TODO : Sajed Work
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { LeadProfileResponseDto } from '@shared/dtos/leads/LeadProfileResponseDto';

export class LeadProfileMapper {
  static toResponse(profile: SysLeadProfiles): LeadProfileResponseDto {
    return {
      personalInformation: {
        sectionTitle: 'Personal Information',
        isEditable: false,

        // 🔥 dynamic extra fields
        joined: profile.createdAt?.getFullYear()?.toString(),
        img_url: profile.imgUrl || null,

        fields: [
          {
            label: 'Full Name',
            value: profile.fullName,
          },
          {
            label: 'Date Of Birth',
            value: profile.dob,
          },
          {
            label: 'Gender',
            value: profile.gender,
          },
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
            id: test.sysEngTestId,
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

          //! if need in future, can be added in SysUsers entity and mapped here
          //   {
          //     id: 'email',
          //     label: 'Email',
          //     value: profile.SysUser?.email || null,
          //   },
        ],
      },

      // academicRecord: {
      //   sectionTitle: 'Academic Record',
      //   isEditable: true,
      //   items:
      //     profile.LeadDocuments?.map((doc) => ({
      //       documentType: {
      //         documentTypeID: doc.sysDocumentTypeId,
      //         documentTypeCode: doc.SysDocumentType?.documentTypeCode,
      //         documentTypeName: doc.SysDocumentType?.documentTypeName,
      //       },
      //     })) || [],
      // },
      //   academicRecord: {
      //     sectionTitle: 'Academic Records',
      //     isEditable: true,
      //     items:
      //       profile.LeadDocuments?.map((doc) => ({
      //         documentType: {
      //           documentTypeId: doc.sysDocumentTypeId,
      //           documentTypeCode: doc.SysDocumentType?.documentTypeCode,
      //           documentTypeName: doc.SysDocumentType?.documentTypeName,
      //         },

      //         uploadedDocuments:
      //           doc.LeadDocumentVersions?.map((data) => ({
      //             documentId: doc.sysDocumentTypeId,
      //             // fileName: v.fileName,
      //             overallStatus: doc.overallStatus, // from parent
      //           })) || [],
      //       })) || [],
      //   },
      academicRecord: {
        sectionTitle: 'Academic Records',
        isEditable: true,

        items:
          profile.LeadDocuments?.map((doc) => ({
            documentType: {
              documentTypeId: doc.sysDocumentTypeId,
              documentTypeCode: doc.SysDocumentType?.documentTypeCode,
              documentTypeName: doc.SysDocumentType?.documentTypeName,
            },

            uploadedDocuments: doc.latestFileName
              ? [
                  {
                    // use the CURRENT version id if you have it
                    documentId: doc.currentLeadDocumentVersionId ?? doc.id,
                    fileName: doc.latestFileName,
                    overallStatus: doc.overallStatus,
                  },
                ]
              : [],
          })) || [],
      },
    };
  }
}
