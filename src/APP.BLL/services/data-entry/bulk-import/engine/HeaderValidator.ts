import { BadRequestException } from '@nestjs/common';

/**
 * Validates that the CSV has at least one data row and that the header row
 * contains all required schema headers. Extra columns allowed.
 */
export function validateSchema(
  rows: Record<string, string>[],
  requiredHeaders: string[],
): void {
  if (rows.length === 0) {
    throw new BadRequestException('CSV contains no data rows.');
  }
  const headers = Object.keys(rows[0]);
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new BadRequestException(
      `Missing required CSV headers: ${missing.join(', ')}. Found: ${headers.join(', ')}`,
    );
  }
}
