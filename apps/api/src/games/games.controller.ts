import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { CreateGameDto, UpdateGameDto, UpdateSchemaDto, GameQueryDto, CreateGameSchema, UpdateGameSchema, UpdateSchemaSchema, GameQuerySchema } from './dto/game.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@Controller('v1/games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Public()
  @Get()
  async getGames(
    @Query() query: GameQueryDto,
  ) {
    const parsed = GameQuerySchema.parse(query);
    return this.gamesService.getGames(parsed);
  }

  @Public()
  @Get(':slug')
  async getGameBySlug(@Param('slug') slug: string) {
    return this.gamesService.getGameBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('game:manage')
  async createGame(
    @Body() body: CreateGameDto,
    @CurrentUser() user: RequestUser,
  ) {
    const dto = CreateGameSchema.parse(body);
    return this.gamesService.createGame(dto, user.userId);
  }

  @Patch(':id/schema')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('game:manage')
  async updateSchema(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSchemaDto,
  ) {
    const dto = UpdateSchemaSchema.parse(body);
    return this.gamesService.updateSchema(id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('game:manage')
  async updateGame(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGameDto,
  ) {
    const dto = UpdateGameSchema.parse(body);
    return this.gamesService.updateGame(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('game:manage')
  async deleteGame(@Param('id', ParseIntPipe) id: number) {
    return this.gamesService.deleteGame(id);
  }
}
