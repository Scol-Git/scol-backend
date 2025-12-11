import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './BaseResponseDto';

/**
 * Success Response DTO
 *
 * Generic success response wrapper that extends BaseResponseDto.
 * Contains the base response fields plus additional data specific to the endpoint.
 *
 * @template T - Type of the data payload
 *
 * @example
 * ```typescript
 * // For login endpoint
 * class LoginResponse extends SuccessResponseDto<AuthResponseDto> {
 *   @ApiProperty({ type: AuthResponseDto })
 *   data!: AuthResponseDto;
 * }
 * ```
 */
export class SuccessResponseDto<T = unknown> extends BaseResponseDto {
  /**
   * Response data (endpoint-specific)
   */
  @ApiProperty({
    description: 'Response data (endpoint-specific)',
  })
  data!: T;
}

