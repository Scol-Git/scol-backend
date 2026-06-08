import { EnrollmentStatus } from '@shared/enums/crm/EnrollmentStatus.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';

export interface CreateLeadCrmInfoInput {
  registerSource: RegisterSource;
  registerDate: Date;
  leadStatus?: LeadStatus;
  targetSysCountryId?: string | null;
  consultantUserId?: string | null;
  hasPassedEnglishTest?: boolean | null;
  enrollmentStatus?: EnrollmentStatus | null;
  enrollmentDate?: Date | null;
}

export interface CreateLeadAccountInput {
  phone: string;
  passwordHash: string;
  fullName: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  gender?: string | null;
  isPhoneVerified?: boolean;
  crmInfo: CreateLeadCrmInfoInput;
}

export interface UpdateLeadCrmInfoInput {
  registerSource?: RegisterSource;
  leadStatus?: LeadStatus;
  targetSysCountryId?: string | null;
  consultantUserId?: string | null;
  hasPassedEnglishTest?: boolean | null;
  enrollmentStatus?: EnrollmentStatus | null;
  enrollmentDate?: Date | null;
}

export interface UpdateLeadAccountInput {
  fullName?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  gender?: string | null;
  crmInfo: UpdateLeadCrmInfoInput;
}
