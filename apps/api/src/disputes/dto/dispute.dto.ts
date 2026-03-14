import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateDisputeDto {
  @IsNotEmpty()
  @IsString()
  orderId!: string;

  @IsNotEmpty()
  @IsString()
  @IsEnum(['account_not_received', 'account_invalid', 'account_not_as_described', 'other'])
  reason!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(20, { message: 'Description must be at least 20 characters' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description!: string;
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}

export class JudgeDisputeDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(['REFUND', 'RELEASE'])
  decision!: 'REFUND' | 'RELEASE';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class WithdrawDisputeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateSettingsDto {
  @IsNotEmpty()
  @IsString()
  key!: string;

  @IsNotEmpty()
  @IsString()
  value!: string;
}
