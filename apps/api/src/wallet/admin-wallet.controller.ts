import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { TopupService } from './topup.service';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminWalletController {
  constructor(private topupService: TopupService) {}

  @Get('topup-requests')
  @RequirePermissions('topup:confirm')
  getPendingTopups() {
    return this.topupService.getPendingRequests();
  }

  @Patch('topup-requests/:id/confirm')
  @RequirePermissions('topup:confirm')
  @HttpCode(HttpStatus.OK)
  confirmTopup(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: RequestUser,
  ) {
    return this.topupService.confirmTopup(id, admin.userId);
  }
}
