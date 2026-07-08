import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle';
import {
  bouquetLines,
  bouquets,
  type Bouquet,
  type BouquetLine,
  type NewBouquet,
  type NewBouquetLine,
} from '../db/schema';
import { mapBouquetProfit, type BouquetProfit } from './types/bouquet-profit';

@Injectable()
export class BouquetsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createBouquet(userId: string, title?: string | null): Promise<Bouquet> {
    const [row] = await this.db
      .insert(bouquets)
      .values({ title: title ?? null, createdByUserId: userId })
      .returning();
    return row;
  }

  findBouquet(id: string): Promise<Bouquet | undefined> {
    return this.db.query.bouquets.findFirst({ where: eq(bouquets.id, id) });
  }

  listBouquets(): Promise<Bouquet[]> {
    return this.db.query.bouquets.findMany({ orderBy: [desc(bouquets.createdAt)] });
  }

  async updateBouquet(id: string, patch: Partial<NewBouquet>): Promise<Bouquet> {
    const [row] = await this.db
      .update(bouquets)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(bouquets.id, id))
      .returning();
    return row;
  }

  async deleteBouquet(id: string): Promise<void> {
    await this.db.delete(bouquets).where(eq(bouquets.id, id));
  }

  // --- lines ---
  listLines(bouquetId: string): Promise<BouquetLine[]> {
    return this.db.query.bouquetLines.findMany({
      where: eq(bouquetLines.bouquetId, bouquetId),
      orderBy: [bouquetLines.createdAt],
    });
  }

  findLine(id: string): Promise<BouquetLine | undefined> {
    return this.db.query.bouquetLines.findFirst({ where: eq(bouquetLines.id, id) });
  }

  async addLine(data: NewBouquetLine): Promise<BouquetLine> {
    const [row] = await this.db.insert(bouquetLines).values(data).returning();
    return row;
  }

  async updateLineQuantity(id: string, quantity: string): Promise<BouquetLine> {
    const [row] = await this.db
      .update(bouquetLines)
      .set({ quantity })
      .where(eq(bouquetLines.id, id))
      .returning();
    return row;
  }

  async deleteLine(id: string): Promise<void> {
    await this.db.delete(bouquetLines).where(eq(bouquetLines.id, id));
  }

  // --- profit view ---
  async getProfit(id: string): Promise<BouquetProfit | undefined> {
    const res = await this.db.execute(
      sql`SELECT * FROM bouquet_profit WHERE bouquet_id = ${id}`,
    );
    const rows = res.rows as Record<string, unknown>[];
    return rows[0] ? mapBouquetProfit(rows[0]) : undefined;
  }

  async listProfits(): Promise<BouquetProfit[]> {
    const res = await this.db.execute(sql`SELECT * FROM bouquet_profit`);
    return (res.rows as Record<string, unknown>[]).map(mapBouquetProfit);
  }
}
