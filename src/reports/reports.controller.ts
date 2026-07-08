import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(from, to);
  }

  @Get('monthly')
  monthly(@Query('year') year?: string) {
    return this.service.monthly(year ? Number(year) : undefined);
  }

  @Get('top-flowers')
  topFlowers(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.service.topFlowers(from, to, limit);
  }

  @Get('outstanding')
  outstanding() {
    return this.service.outstanding();
  }
}
