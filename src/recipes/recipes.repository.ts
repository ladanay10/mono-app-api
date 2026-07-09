import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle';
import {
  recipeLines,
  recipes,
  type NewRecipe,
  type NewRecipeLine,
  type Recipe,
  type RecipeLine,
} from '../db/schema';

@Injectable()
export class RecipesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list(): Promise<Recipe[]> {
    return this.db.query.recipes.findMany({ orderBy: [desc(recipes.createdAt)] });
  }

  findById(id: string): Promise<Recipe | undefined> {
    return this.db.query.recipes.findFirst({ where: eq(recipes.id, id) });
  }

  listLines(recipeId: string): Promise<RecipeLine[]> {
    return this.db.query.recipeLines.findMany({
      where: eq(recipeLines.recipeId, recipeId),
      orderBy: [recipeLines.createdAt],
    });
  }

  linesForRecipes(ids: string[]): Promise<RecipeLine[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.db.query.recipeLines.findMany({
      where: inArray(recipeLines.recipeId, ids),
      orderBy: [recipeLines.createdAt],
    });
  }

  // Create the recipe and its lines together so a failure leaves neither half.
  async create(recipe: NewRecipe, lines: Omit<NewRecipeLine, 'recipeId'>[]): Promise<Recipe> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(recipes).values(recipe).returning();
      if (lines.length) {
        await tx.insert(recipeLines).values(lines.map((l) => ({ ...l, recipeId: row.id })));
      }
      return row;
    });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(recipes).where(eq(recipes.id, id));
  }
}
