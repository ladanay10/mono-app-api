import { Module } from '@nestjs/common';
import { BouquetsController } from './bouquets.controller';
import { BouquetsService } from './bouquets.service';
import { BouquetsRepository } from './bouquets.repository';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [CatalogModule],
  controllers: [BouquetsController],
  providers: [BouquetsService, BouquetsRepository],
  exports: [BouquetsService],
})
export class BouquetsModule {}
