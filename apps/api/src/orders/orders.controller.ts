import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@giaodich/shared';

@Controller('v1/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ORDER_VIEW)
  async getOrders(@Req() req: any) {
    const userId = req.user.userId;
    return this.ordersService.getOrders(userId);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ORDER_VIEW)
  async getOrder(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.ordersService.getOrderById(id, userId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ORDER_CREATE)
  async createOrder(@Body() body: { listing_id: number }, @Req() req: any) {
    const userId = req.user.userId;
    return this.ordersService.createOrder({ listingId: body.listing_id }, userId);
  }

  @Post(':id/deliver')
  @RequirePermissions(PERMISSIONS.ORDER_DELIVER)
  async deliverOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { username?: string; password?: string; extra_info?: Record<string, unknown> },
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    return this.ordersService.deliverOrder(id, {
      username: body.username,
      password: body.password,
      extraInfo: body.extra_info,
    }, userId);
  }

  @Post(':id/confirm')
  @RequirePermissions(PERMISSIONS.ORDER_CONFIRM)
  async confirmReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.ordersService.confirmReceipt(id, userId);
  }

  @Get(':id/game-info')
  @RequirePermissions(PERMISSIONS.ORDER_VIEW)
  async getGameInfo(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.userId;
    return this.ordersService.getGameInfo(id, userId);
  }
}
