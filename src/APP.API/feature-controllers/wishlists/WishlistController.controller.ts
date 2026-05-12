import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { RoleGuard } from '@api/common/guards/RoleGuard.guard';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';

import type { ICurrentUser } from '@shared/interfaces/domain';
import { Role } from '@shared/enums/Role.enum';

import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { WishlistService } from '@bll/services/wishlist/WishlistService';

import { AddWishlistDto } from '@shared/dtos/wishlists/AddWishlistDto';
import { WishlistActionResponseDto } from '@shared/dtos/wishlists/WishlistActionResponseDto';
import { WishlistListResponseDto } from '@shared/dtos/wishlists/WishlistListResponseDto';
import { WishlistResponseDto } from '@shared/dtos/wishlists/WishlistResponseDto';

/**
 * Wishlist (favourite courses) endpoints for the authenticated lead.
 *
 *  - `GET    /wishlists`            – list saved intakes (newest first)
 *  - `PUT    /wishlists`            – add an intake to the wishlist
 *  - `DELETE /wishlists/:courseId`  – remove an intake from the wishlist
 *
 * `courseId` in path / payload is the **course intake id**
 * (`UniCourseIntakes.id`).
 */
@ApiTags('wishlists')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(
  AddWishlistDto,
  WishlistResponseDto,
  WishlistListResponseDto,
  WishlistActionResponseDto,
)
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.LEAD)
@Controller('wishlists')
export class WishlistController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly db: AppDbContext,
  ) {}

  @Get()
  @ApiOkResponse({ type: WishlistListResponseDto })
  async getWishlists(
    @CurrentUser() user: ICurrentUser,
  ): Promise<WishlistListResponseDto> {
    const leadId = await this.resolveLeadIdOrThrow(user.userId);
    return this.wishlistService.getWishlists(leadId);
  }

  @Put()
  @ApiOkResponse({ type: WishlistActionResponseDto })
  async addWishlist(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: AddWishlistDto,
  ): Promise<WishlistActionResponseDto> {
    const leadId = await this.resolveLeadIdOrThrow(user.userId);
    return this.wishlistService.addToWishlist(leadId, dto);
  }

  @Delete(':courseId')
  @ApiOkResponse({ type: WishlistActionResponseDto })
  async removeWishlist(
    @CurrentUser() user: ICurrentUser,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ): Promise<WishlistActionResponseDto> {
    const leadId = await this.resolveLeadIdOrThrow(user.userId);
    return this.wishlistService.removeFromWishlist(leadId, courseId);
  }

  /**
   * `LeadFavouriteCourses.leadId` FK points at `SysLeadProfiles.id`, but
   * `ICurrentUser` only carries the auth `userId`. Resolve here so the service
   * stays simple and takes `leadId` directly.
   */
  private async resolveLeadIdOrThrow(userId: string): Promise<string> {
    const lead = await this.db.leadProfiles.findOne({ where: { userId } });
    if (!lead) {
      throw new NotFoundException('Lead profile not found');
    }
    return lead.id;
  }
}
