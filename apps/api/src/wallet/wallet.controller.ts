import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { TopupService } from './topup.service';
import { WithdrawService } from './withdraw.service';
import { InsuranceService } from './insurance.service';
import {
  TopupBankDto,
  TopupGatewayDto,
  WithdrawDto,
  InsuranceDepositDto,
  InsuranceWithdrawDto,
} from './dto/wallet.dto';

@Controller('v1/wallet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WalletController {
  constructor(
    private walletService: WalletService,
    private topupService: TopupService,
    private withdrawService: WithdrawService,
    private insuranceService: InsuranceService,
  ) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: RequestUser) {
    const available = await this.walletService.getBalance(user.userId);
    const insurance = await this.walletService.getInsuranceBalance(user.userId);
    return { available, insurance };
  }

  @Post('topup/bank')
  @HttpCode(HttpStatus.CREATED)
  createBankTopup(@CurrentUser() user: RequestUser, @Body() dto: TopupBankDto) {
    return this.topupService.createBankRequest(user.userId, dto);
  }

  @Post('topup/gateway')
  @HttpCode(HttpStatus.CREATED)
  initGatewayTopup(@CurrentUser() user: RequestUser, @Body() dto: TopupGatewayDto) {
    return this.topupService.initGatewayTopup(user.userId, dto);
  }

  @Post('topup/webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: { reference: string; status: 'SUCCESS' | 'FAILED' }) {
    return this.topupService.handleWebhook(body);
  }

  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  withdraw(@CurrentUser() user: RequestUser, @Body() dto: WithdrawDto) {
    return this.withdrawService.createWithdrawRequest(user.userId, dto);
  }

  @Get('insurance')
  async getInsuranceBalance(@CurrentUser() user: RequestUser) {
    const balance = await this.walletService.getInsuranceBalance(user.userId);
    return { balance };
  }

  @Post('insurance/deposit')
  @HttpCode(HttpStatus.CREATED)
  insuranceDeposit(@CurrentUser() user: RequestUser, @Body() dto: InsuranceDepositDto) {
    return this.insuranceService.deposit(user.userId, dto);
  }

  @Post('insurance/withdraw')
  @HttpCode(HttpStatus.CREATED)
  insuranceWithdraw(@CurrentUser() user: RequestUser, @Body() dto: InsuranceWithdrawDto) {
    return this.insuranceService.withdraw(user.userId, dto);
  }
}
