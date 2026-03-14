import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JudgeDisputeDto, UpdateSettingsDto } from './dto/dispute.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('api/admin/disputes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DisputesAdminController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  async getAllDisputes(
    @Query('status') status?: string,
    @Query('buyerId') buyerId?: string,
    @Query('sellerId') sellerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.disputesService.getAllDisputes({
      status,
      buyerId: buyerId ? parseInt(buyerId) : undefined,
      sellerId: sellerId ? parseInt(sellerId) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('stats')
  async getStats() {
    return this.disputesService.getDisputeStats();
  }

  @Get(':id')
  async getDisputeById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.disputesService.getDisputeById(id, req.user.id);
  }

  @Post(':id/judge')
  async judgeDispute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: JudgeDisputeDto,
    @Request() req: any,
  ) {
    return this.disputesService.judgeDispute(id, dto, req.user.id);
  }

  @Get('settings')
  async getSettings() {
    return this.disputesService.getSettings();
  }

  @Post('settings')
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @Request() req: any,
  ) {
    return this.disputesService.updateSettings(dto.key, dto.value, req.user.id);
  }
}
