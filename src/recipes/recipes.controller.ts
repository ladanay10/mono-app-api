import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { SaveFromBouquetDto } from './dto/save-from-bouquet.dto';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  // Save a bouquet's current composition as a reusable template.
  @Post('from-bouquet')
  saveFromBouquet(@Body() dto: SaveFromBouquetDto, @CurrentUser() user: AuthUser) {
    return this.service.saveFromBouquet(dto, user);
  }

  // Create a fresh DRAFT bouquet from a template (returns the new bouquet).
  @Post(':id/use')
  use(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.use(id, user);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
