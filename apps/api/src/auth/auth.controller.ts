import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../common/decorators/current-user.decorator';
import { RefreshTokenPayload } from './strategies/refresh-token.strategy';

@Controller('v1/auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@CurrentUser() user: RequestUser) {
    return this.authService.login(user.userId, user.email);
  }

  @Post('refresh')
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  refreshToken(@CurrentUser() user: RefreshTokenPayload & RequestUser) {
    return this.authService.refreshTokens(
      user.userId,
      user.email,
      user.refreshToken,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: RequestUser) {
    return this.authService.logout(user.userId);
  }

  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.userId);
  }
}
