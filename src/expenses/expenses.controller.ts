import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import type { Expense } from '../db/schema';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  list(
    @Query('bouquetId') bouquetId?: string,
    @Query('scope') scope?: Expense['scope'],
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list({ bouquetId, scope, from, to });
  }

  @Post()
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
