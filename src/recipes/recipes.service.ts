import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecipesRepository } from './recipes.repository';
import { BouquetsService } from '../bouquets/bouquets.service';
import { SaveFromBouquetDto } from './dto/save-from-bouquet.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { Recipe, RecipeLine } from '../db/schema';

type RecipeWithLines = Recipe & { lines: RecipeLine[] };

@Injectable()
export class RecipesService {
  constructor(
    private readonly repo: RecipesRepository,
    private readonly bouquets: BouquetsService,
  ) {}

  async list(): Promise<RecipeWithLines[]> {
    const rows = await this.repo.list();
    const lines = await this.repo.linesForRecipes(rows.map((r) => r.id));
    const byRecipe = new Map<string, RecipeLine[]>();
    for (const l of lines) {
      const arr = byRecipe.get(l.recipeId) ?? [];
      arr.push(l);
      byRecipe.set(l.recipeId, arr);
    }
    return rows.map((r) => ({ ...r, lines: byRecipe.get(r.id) ?? [] }));
  }

  async get(id: string): Promise<RecipeWithLines> {
    const recipe = await this.repo.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    return { ...recipe, lines: await this.repo.listLines(id) };
  }

  // Snapshot a bouquet's current composition into a reusable template.
  async saveFromBouquet(
    dto: SaveFromBouquetDto,
    user: AuthUser,
  ): Promise<RecipeWithLines> {
    const bouquet = await this.bouquets.get(dto.bouquetId); // throws 404 if missing
    if (bouquet.lines.length === 0) {
      throw new BadRequestException(
        'Cannot save an empty bouquet as a template',
      );
    }
    const recipe = await this.repo.create(
      { name: dto.name, notes: dto.notes ?? null, createdByUserId: user.id },
      bouquet.lines.map((l) => ({
        catalogItemId: l.catalogItemId,
        itemNameSnapshot: l.itemNameSnapshot,
        unitSnapshot: l.unitSnapshot,
        quantity: String(l.quantity),
        unitPurchasePriceKopiyky: l.unitPurchasePriceKopiyky,
        unitSalePriceKopiyky: l.unitSalePriceKopiyky,
      })),
    );
    return this.get(recipe.id);
  }

  // Instantiate a template into a fresh DRAFT bouquet. Catalog lines re-pull the
  // current price; if a catalog item is gone, fall back to the stored snapshot.
  async use(id: string, user: AuthUser) {
    const recipe = await this.get(id);
    const bouquet = await this.bouquets.create({ title: recipe.name }, user);
    for (const line of recipe.lines) {
      const quantity = Number(line.quantity);
      if (line.catalogItemId) {
        try {
          await this.bouquets.addLine(bouquet.id, {
            catalogItemId: line.catalogItemId,
            quantity,
          });
          continue;
        } catch {
          /* catalog item gone — fall back to the stored snapshot below */
        }
      }
      await this.bouquets.addLine(bouquet.id, {
        itemName: line.itemNameSnapshot,
        unit: line.unitSnapshot,
        purchasePriceKopiyky: line.unitPurchasePriceKopiyky,
        salePriceKopiyky: line.unitSalePriceKopiyky,
        quantity,
      });
    }
    return this.bouquets.get(bouquet.id);
  }

  async remove(id: string): Promise<void> {
    const recipe = await this.repo.findById(id);
    if (!recipe) throw new NotFoundException('Recipe not found');
    await this.repo.delete(id);
  }
}
