import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponseDto } from './BaseResponseDto';

/**
 * Error Response DTO
 *
 * Standardized error response that extends BaseResponseDto.
 * Used by HttpExceptionFilter to format all error responses.
 */
export class ErrorResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Response status (always "error" for error responses)',
    example: 'error',
  })
  override status!: string;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid input data',
  })
  override message!: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  override statusCode!: number;

  @ApiPropertyOptional({
    description: 'Error details (only present when status is "error")',
    type: 'object',
    additionalProperties: true,
    example: {
      code: 'RESEND_COOLDOWN_ACTIVE',
    },
  })
  error?: {
    code?: string;
    details?: Record<string, string[]>;
  };
}

