import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle';
import {
  bouquets,
  expenses,
  type Expense,
  type NewExpense,
} from '../db/schema';

export interface ExpenseFilter {
  bouquetId?: string;
  scope?: Expense['scope'];
  from?: string;
  to?: string;
}

@Injectable()
export class ExpensesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async bouquetExists(id: string): Promise<boolean> {
    const row = await this.db.query.bouquets.findFirst({
      where: eq(bouquets.id, id),
      columns: { id: true },
    });
    return !!row;
  }

  list(filter: ExpenseFilter): Promise<Expense[]> {
    const conds: SQL[] = [];
    if (filter.bouquetId) conds.push(eq(expenses.bouquetId, filter.bouquetId));
    if (filter.scope) conds.push(eq(expenses.scope, filter.scope));
    if (filter.from) conds.push(gte(expenses.incurredOn, filter.from));
    if (filter.to) conds.push(lte(expenses.incurredOn, filter.to));
    return this.db.query.expenses.findMany({
      where: conds.length ? and(...conds) : undefined,
      orderBy: [desc(expenses.incurredOn), desc(expenses.createdAt)],
    });
  }

  findById(id: string): Promise<Expense | undefined> {
    return this.db.query.expenses.findFirst({ where: eq(expenses.id, id) });
  }

  async create(data: NewExpense): Promise<Expense> {
    const [row] = await this.db.insert(expenses).values(data).returning();
    return row;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(expenses).where(eq(expenses.id, id));
  }
}
