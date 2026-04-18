import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { ApplicationCreationService } from '@bll/services/applications/ApplicationCreationService';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@shared/enums/Role.enum';
import { RequireRole } from '@api/common/decorators/RequireRole.decorator';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationCreationService: ApplicationCreationService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequireRole(Role.LEAD)
  @ApiBearerAuth('JWT-auth')
  async createApplication(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    return this.applicationCreationService.createApplication(user.userId, dto);
  }
}
