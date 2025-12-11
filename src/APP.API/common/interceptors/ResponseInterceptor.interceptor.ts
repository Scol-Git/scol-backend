import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';

/**
 * Response Interceptor
 *
 * Automatically wraps all successful responses with the base response structure.
 * Transforms responses to include: status, message, statusCode, and data.
 *
 * @example
 * Before: { userId: "123", accessToken: "..." }
 * After: {
 *   status: "success",
 *   message: "Operation completed successfully",
 *   statusCode: 200,
 *   data: { userId: "123", accessToken: "..." }
 * }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data) => {
        // If data is already a SuccessResponseDto, return as is
        if (data instanceof SuccessResponseDto) {
          return data;
        }

        // If data is null or undefined, return empty success response
        if (data === null || data === undefined) {
          const successResponse = new SuccessResponseDto();
          successResponse.status = 'success';
          successResponse.message = 'Operation completed successfully';
          successResponse.statusCode = statusCode;
          successResponse.data = {} as unknown;
          return successResponse;
        }

        // Extract message if present in data
        const message = this.extractMessage(data);
        const dataWithoutMessage = this.removeMessageFromData(data);

        // Wrap the response data
        const successResponse = new SuccessResponseDto();
        successResponse.status = 'success';
        successResponse.message = message;
        successResponse.statusCode = statusCode;
        successResponse.data = dataWithoutMessage;

        return successResponse;
      }),
    );
  }

  /**
   * Extract message from response data if present
   */
  private extractMessage(data: unknown): string {
    // If data has a message property, use it
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: string }).message;
      if (typeof message === 'string' && message) {
        return message;
      }
    }

    // Default success message
    return 'Operation completed successfully';
  }

  /**
   * Remove message property from data to avoid duplication
   */
  private removeMessageFromData(data: unknown): unknown {
    if (data && typeof data === 'object' && data !== null && 'message' in data) {
      const { message, ...rest } = data as { message?: string; [key: string]: unknown };
      return rest;
    }
    return data;
  }
}

