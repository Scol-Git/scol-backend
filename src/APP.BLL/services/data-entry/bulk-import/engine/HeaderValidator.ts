/**
 * Validates CSV row count and required headers before processing.
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Validates that the CSV has at least one data row and that the header row
 * contains all required schema headers. Extra columns allowed.
 *
 * @throws BadRequestException when no data rows or when required headers are missing.
 */
export function validateSchema(
  rows: Record<string, string>[],
  requiredHeaders: string[],
): void {
  if (rows.length === 0) {
    throw new BadRequestException('CSV contains no data rows.');
  }
  const headers = Object.keys(rows[0]);
  if (headers.length === 0) {
    throw new BadRequestException('CSV has no column headers (first row has no columns).');
  }
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new BadRequestException(
      `Missing required CSV headers: ${missing.join(', ')}. Found: ${headers.join(', ')}`,
    );
  }
}
