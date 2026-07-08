import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle';
import {
  catalogItems,
  type CatalogItem,
  type NewCatalogItem,
} from '../db/schema';

@Injectable()
export class CatalogRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  list(includeInactive: boolean): Promise<CatalogItem[]> {
    return this.db.query.catalogItems.findMany({
      where: includeInactive ? undefined : eq(catalogItems.isActive, true),
      orderBy: [desc(catalogItems.createdAt)],
    });
  }

  findById(id: string): Promise<CatalogItem | undefined> {
    return this.db.query.catalogItems.findFirst({
      where: eq(catalogItems.id, id),
    });
  }

  async create(data: NewCatalogItem): Promise<CatalogItem> {
    const [row] = await this.db.insert(catalogItems).values(data).returning();
    return row;
  }

  async update(
    id: string,
    data: Partial<NewCatalogItem>,
  ): Promise<CatalogItem | undefined> {
    const [row] = await this.db
      .update(catalogItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(catalogItems.id, id))
      .returning();
    return row;
  }
}
