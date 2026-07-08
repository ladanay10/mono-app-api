import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { BouquetsService } from './bouquets.service';
import { CreateBouquetDto } from './dto/create-bouquet.dto';
import { UpdateBouquetDto } from './dto/update-bouquet.dto';
import { AddLineDto } from './dto/add-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { SellBouquetDto } from './dto/sell-bouquet.dto';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';

@Controller('bouquets')
export class BouquetsController {
  constructor(private readonly service: BouquetsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateBouquetDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBouquetDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  // --- composition ---
  @Post(':id/lines')
  addLine(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddLineDto) {
    return this.service.addLine(id, dto);
  }

  @Patch(':id/lines/:lineId')
  updateLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() dto: UpdateLineDto,
  ) {
    return this.service.updateLine(id, lineId, dto);
  }

  @Delete(':id/lines/:lineId')
  removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
  ) {
    return this.service.removeLine(id, lineId);
  }

  // --- status transitions ---
  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.confirm(id);
  }

  @Post(':id/sell')
  @HttpCode(200)
  sell(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SellBouquetDto) {
    return this.service.sell(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }

  @Post(':id/clone')
  clone(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.service.clone(id, user);
  }
}
