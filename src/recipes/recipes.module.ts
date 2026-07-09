import { Module } from '@nestjs/common';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RecipesRepository } from './recipes.repository';
import { BouquetsModule } from '../bouquets/bouquets.module';

@Module({
  imports: [BouquetsModule],
  controllers: [RecipesController],
  providers: [RecipesService, RecipesRepository],
})
export class RecipesModule {}
