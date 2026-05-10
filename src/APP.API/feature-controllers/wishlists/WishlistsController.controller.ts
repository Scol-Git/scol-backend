import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
// import { RateLimitGuard } from '@api/common/guards/RateLimitGuard.guard'; // DEFERRED
// import { RateLimit } from '@api/common/decorators/RateLimit.decorator';   // DEFERRED
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { Role } from '@shared/enums/Role.enum';

import { WishlistService } from '@bll/services/wishlist/WishlistService';
import { AddToWishlistRequestDto } from '@shared/dtos/wishlists/AddToWishlistRequestDto';
import { WishlistMutationMessageDto } from '@shared/dtos/wishlists/WishlistMutationMessageDto';
import { WishlistsResponseDto } from '@shared/dtos/wishlists/WishlistsResponseDto';
import { WishlistItemDto } from '@shared/dtos/wishlists/WishlistItemDto';

/**
 * Wishlists Controller
 *
 * Endpoints (all require a `LEAD` JWT):
 * - `GET    /wishlists`            -- list current user's wishlisted intakes
 * - `PUT    /wishlists`            -- add a course intake (idempotent)
 * - `DELETE /wishlists/:courseId`  -- remove a course intake (idempotent)
 *
 * The `:courseId` path param and the `GET /wishlists` response field
 * `courseId` are both `UniCourseIntakes.id` (matching the listing APIs).
 * The `PUT` body uses the more explicit name `courseIntakeId` for the same
 * value.
 */
@ApiTags('wishlists')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  AddToWishlistRequestDto,
  WishlistMutationMessageDto,
  WishlistsResponseDto,
  WishlistItemDto,
)
@UseGuards(JwtAuthGuard, RoleGuard /*, RateLimitGuard */)
@RequireRole(Role.LEAD)
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistService: WishlistService) {}

  /**
   * GET /wishlists
   *
   * Returns the user's wishlisted course intakes, newest first. Hides rows
   * pointing to inactive / soft-deleted intakes so the UI never paints
   * ghost cards.
   */
  @Get()
  @ApiOperation({ summary: 'List the current user\'s wishlist' })
  @ApiResponse({ status: 200, type: WishlistsResponseDto })
  @ApiResponse({ status: 401, description: 'Missing / invalid token' })
  @ApiResponse({ status: 403, description: 'Not a LEAD user' })
  @ApiResponse({ status: 404, description: 'LEAD_PROFILE_NOT_FOUND' })
  async list(
    @CurrentUser() user: ICurrentUser,
  ): Promise<WishlistsResponseDto> {
    return this.wishlistService.getMyWishlist(user.userId);
  }

  /**
   * PUT /wishlists
   *
   * Adds a course intake to the wishlist. Atomic and idempotent: re-adding
   * the same intake never creates a duplicate row and never trips the
   * per-user cap (`WISHLIST_PER_USER_LIMIT`, default 5).
   */
  @Put()
  // @RateLimit({ limit: 60, windowSeconds: 60 }) // DEFERRED
  @ApiOperation({ summary: 'Add a course intake to the wishlist' })
  @ApiResponse({ status: 200, type: WishlistMutationMessageDto })
  @ApiResponse({ status: 400, description: 'INACTIVE_COURSE_INTAKE or invalid body' })
  @ApiResponse({ status: 401, description: 'Missing / invalid token' })
  @ApiResponse({ status: 403, description: 'Not a LEAD user' })
  @ApiResponse({ status: 404, description: 'LEAD_PROFILE_NOT_FOUND or intake not found' })
  @ApiResponse({ status: 409, description: 'WISHLIST_LIMIT_REACHED' })
  async add(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddToWishlistRequestDto,
  ): Promise<WishlistMutationMessageDto> {
    await this.wishlistService.addToWishlist(user.userId, dto.courseIntakeId);
    return {
      success: true,
      message: 'Course added to wishlist successfully',
    };
  }

  /**
   * DELETE /wishlists/:courseId
   *
   * Removes a course intake from the wishlist. Idempotent: deleting a row
   * that isn't there still resolves successfully so the heart toggle is
   * always safe to retry.
   */
  @Delete(':courseId')
  // @RateLimit({ limit: 60, windowSeconds: 60 }) // DEFERRED
  @ApiOperation({ summary: 'Remove a course intake from the wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Course intake removed (or was not on the wishlist).',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(WishlistMutationMessageDto) },
        example: {
          success: true,
          message: 'Course removed from wishlist successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: ':courseId path param is not a UUID' })
  @ApiResponse({ status: 401, description: 'Missing / invalid token' })
  @ApiResponse({ status: 403, description: 'Not a LEAD user' })
  @ApiResponse({ status: 404, description: 'LEAD_PROFILE_NOT_FOUND' })
  async remove(
    @CurrentUser() user: ICurrentUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<WishlistMutationMessageDto> {
    await this.wishlistService.removeFromWishlist(user.userId, courseId);
    return {
      success: true,
      message: 'Course removed from wishlist successfully',
    };
  }
}
