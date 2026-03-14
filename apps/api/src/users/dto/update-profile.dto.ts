import { IsString, IsOptional, IsUrl, MaxLength, IsHexColor } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;
}

export class UpdateVipProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @IsHexColor()
  @MaxLength(7)
  nameColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
