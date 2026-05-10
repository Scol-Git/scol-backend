import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Lead Profile Not Found Exception
 *
 * Thrown when an authenticated `LEAD` user has no `SysLeadProfiles` row
 * (data inconsistency, or account stuck mid-onboarding).
 *
 * Returns 404 Not Found.
 */
export class LeadProfileNotFoundException extends HttpException {
  constructor() {
    super(
      {
        message: 'Lead profile not found',
        error: { code: 'LEAD_PROFILE_NOT_FOUND' },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
