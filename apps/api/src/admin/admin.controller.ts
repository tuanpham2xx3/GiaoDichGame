import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService, UserListQuery } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@giaodich/shared';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ========== Stats ==========

  @Get('stats')
  @RequirePermissions(PERMISSIONS.STATS_VIEW)
  getStats() {
    return this.adminService.getStats();
  }

  // ========== User Management ==========

  @Get('users')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Get('users/:id')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/ban')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  banUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.banUser(id);
  }

  @Patch('users/:id/unban')
  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  unbanUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.unbanUser(id);
  }
}
