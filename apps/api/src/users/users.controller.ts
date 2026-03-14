import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateVipProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PERMISSIONS } from '@giaodich/shared';
import { VipService } from '../vip/vip.service';

@Controller('v1/users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly vipService: VipService,
  ) {}

  @Get(':id')
  @Public()
  getProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserPublicProfile(id);
  }

  @Get('me/profile')
  getMyProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.getUserPublicProfile(user.userId);
  }

  @Patch('me')
  @RequirePermissions('profile:edit')
  updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Patch('me/vip-profile')
  @RequirePermissions('profile:edit')
  async updateVipProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateVipProfileDto,
  ) {
    // Check if user is VIP
    const isVip = await this.vipService.isVip(user.userId);
    if (!isVip) {
      throw new Error('Only VIP users can update their VIP profile');
    }
    return this.usersService.createOrUpdateProfile(user.userId, dto);
  }

  @Get('me/transactions')
  getTransactions(@CurrentUser() user: RequestUser) {
    return this.usersService.getTransactionHistory(user.userId);
  }
}
