import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { VipService, CreateVipPackageDto, UpdateVipPackageDto, PurchaseVipDto } from './vip.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@giaodich/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  // ========== Public: List Packages ==========

  @Get('packages')
  async getPackages(@Query('active') active?: string) {
    return this.vipService.getPackages(active !== 'false');
  }

  @Get('packages/:id')
  async getPackageById(@Param('id', ParseIntPipe) id: number) {
    const pkg = await this.vipService.getPackageById(id);
    if (!pkg) {
      return { error: 'Package not found' };
    }
    return pkg;
  }

  // ========== User: My VIP ==========

  @UseGuards(JwtAuthGuard)
  @Get('my-vip')
  async getMyVip(@CurrentUser() user: { id: number }) {
    const vip = await this.vipService.getUserVip(user.id);
    const benefits = await this.vipService.getUserBenefits(user.id);
    return { vip, benefits };
  }

  @UseGuards(JwtAuthGuard)
  @Post('purchase')
  async purchaseVip(
    @CurrentUser() user: { id: number },
    @Body() dto: PurchaseVipDto,
  ) {
    const subscription = await this.vipService.purchaseVip(user.id, dto);
    return { success: true, subscription };
  }

  // ========== Admin: Manage Packages ==========

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.VIP_MANAGE)
  @Post('admin/packages')
  async createPackage(@Body() dto: CreateVipPackageDto) {
    const pkg = await this.vipService.createPackage(dto);
    return { success: true, pkg };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.VIP_MANAGE)
  @Put('admin/packages/:id')
  async updatePackage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVipPackageDto,
  ) {
    const pkg = await this.vipService.updatePackage(id, dto);
    return { success: true, pkg };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.VIP_MANAGE)
  @Delete('admin/packages/:id')
  async deletePackage(@Param('id', ParseIntPipe) id: number) {
    await this.vipService.deletePackage(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.VIP_MANAGE)
  @Get('admin/packages')
  async getAllPackages(@Query('active') active?: string) {
    return this.vipService.getPackages(active !== 'false');
  }
}
