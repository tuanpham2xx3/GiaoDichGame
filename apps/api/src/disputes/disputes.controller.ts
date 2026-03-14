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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, SendMessageDto, WithdrawDisputeDto } from './dto/dispute.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  async createDispute(@Body() dto: CreateDisputeDto, @Request() req: any) {
    return this.disputesService.createDispute(dto, req.user.id);
  }

  @Get()
  async getDisputes(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    return this.disputesService.getDisputes(req.user.id, { status });
  }

  @Get(':id')
  async getDisputeById(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.disputesService.getDisputeById(id, req.user.id);
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
    @Request() req: any,
  ) {
    return this.disputesService.sendMessage(id, dto, req.user.id);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.disputesService.getMessages(id, req.user.id);
  }

  @Post(':id/withdraw')
  async withdrawDispute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WithdrawDisputeDto,
    @Request() req: any,
  ) {
    return this.disputesService.withdrawDispute(id, req.user.id);
  }

  @Post(':id/evidence')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidence(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.disputesService.uploadEvidence(
      id,
      {
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
      },
      req.user.id,
    );
  }

  @Get(':id/evidence')
  async getEvidence(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return this.disputesService.getEvidence(id, req.user.id);
  }
}
