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
import { ListingsService } from './listings.service';
import { CreateListingSchema, UpdateListingSchema, ListingQuerySchema, PinListingSchema, ListingQueryDto } from './dto/listing.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';

@Controller('v1/listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Public()
  @Get()
  async getListings(@Query() query: ListingQueryDto) {
    const parsed = ListingQuerySchema.parse(query);
    return this.listingsService.getListings(parsed);
  }

  @Get('my/listings')
  @UseGuards(JwtAuthGuard)
  async getMyListings(@CurrentUser() user: RequestUser) {
    return this.listingsService.getMyListings(user.userId);
  }

  @Public()
  @Get(':id')
  async getListingById(@Param('id', ParseIntPipe) id: number) {
    return this.listingsService.getListingById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('listing:create')
  async createListing(
    @Body() body: typeof CreateListingSchema,
    @CurrentUser() user: RequestUser,
  ) {
    const dto = CreateListingSchema.parse(body);
    return this.listingsService.createListing(dto, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('listing:edit')
  async updateListing(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: typeof UpdateListingSchema,
    @CurrentUser() user: RequestUser,
  ) {
    const dto = UpdateListingSchema.parse(body);
    return this.listingsService.updateListing(id, dto, user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermissions('listing:delete')
  async deleteListing(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.listingsService.deleteListing(id, user.userId);
  }
}
