import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PinService, CreatePinConfigDto, UpdatePinConfigDto, PurchasePinDto } from './pin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@giaodich/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pin')
export class PinController {
  constructor(private readonly pinService: PinService) {}

  // ========== User: My Pins ==========

  @UseGuards(JwtAuthGuard)
  @Get('my-pins')
  async getMyPins(@CurrentUser() user: { id: number }) {
    return this.pinService.getMyPins(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('calculate-price')
  async calculatePrice(
    @Query('days', ParseIntPipe) days: number,
    @CurrentUser() user?: { id: number },
  ) {
    return this.pinService.calculatePrice(days, user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('purchase')
  async purchasePin(
    @CurrentUser() user: { id: number },
    @Body() dto: PurchasePinDto,
  ) {
    const pin = await this.pinService.purchasePin(user.id, dto);
    return { success: true, pin };
  }

  @Get('listing/:listingId')
  async getListingPins(@Param('listingId', ParseIntPipe) listingId: number) {
    return this.pinService.getListingPins(listingId);
  }

  // ========== Admin: Pin Config ==========

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PIN_MANAGE)
  @Get('admin/config')
  async getConfig() {
    const config = await this.pinService.getConfig();
    return config || { message: 'No config found, will use defaults' };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.PIN_MANAGE)
  @Put('admin/config')
  async updateConfig(@Body() dto: UpdatePinConfigDto) {
    const config = await this.pinService.updateConfig(dto);
    return { success: true, config };
  }
}
