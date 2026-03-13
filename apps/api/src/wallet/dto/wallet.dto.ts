import { IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

export class TopupBankDto {
  @IsNumber()
  @IsPositive()
  amountCoin!: number;
}

export class TopupGatewayDto {
  @IsNumber()
  @IsPositive()
  amountCoin!: number;

  @IsString()
  method!: 'MOMO' | 'VNPAY' | 'ZALOPAY';
}

export class WithdrawDto {
  @IsNumber()
  @IsPositive()
  amountCoin!: number;

  @IsString()
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @MaxLength(50)
  bankAccount!: string;

  @IsString()
  @MaxLength(100)
  bankHolder!: string;
}

export class InsuranceDepositDto {
  @IsNumber()
  @IsPositive()
  amountCoin!: number;
}

export class InsuranceWithdrawDto {
  @IsNumber()
  @IsPositive()
  amountCoin!: number;
}
