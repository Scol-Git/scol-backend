import { ApiProperty } from '@nestjs/swagger';

/**
 * Base Response DTO
 *
 * All API responses inherit from this base structure.
 * Provides consistent response format across all endpoints.
 */
export class BaseResponseDto {
  /**
   * Response status (e.g., "success", "error")
   * @example "success"
   */
  @ApiProperty({
    description: 'Response status',
    example: 'success',
    enum: ['success', 'error'],
  })
  status!: string;

  /**
   * Human-readable message
   * @example "Operation completed successfully"
   */
  @ApiProperty({
    description: 'Human-readable message',
    example: 'Operation completed successfully',
  })
  message!: string;

  /**
   * HTTP status code
   * @example 200
   */
  @ApiProperty({
    description: 'HTTP status code',
    example: 200,
  })
  statusCode!: number;
}

