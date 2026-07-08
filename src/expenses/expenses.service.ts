import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpensesRepository, type ExpenseFilter } from './expenses.repository';
import { CreateExpenseDto } from './dto/create-expense.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { Expense } from '../db/schema';

@Injectable()
export class ExpensesService {
  constructor(private readonly repo: ExpensesRepository) {}

  list(filter: ExpenseFilter): Promise<Expense[]> {
    return this.repo.list(filter);
  }

  async create(dto: CreateExpenseDto, user: AuthUser): Promise<Expense> {
    if (dto.scope === 'BOUQUET') {
      if (!dto.bouquetId) {
        throw new BadRequestException('A BOUQUET expense requires bouquetId');
      }
      if (!(await this.repo.bouquetExists(dto.bouquetId))) {
        throw new NotFoundException('Bouquet not found');
      }
    } else if (dto.bouquetId) {
      throw new BadRequestException(
        'A GENERAL expense must not carry a bouquetId',
      );
    }

    return this.repo.create({
      scope: dto.scope,
      bouquetId: dto.scope === 'BOUQUET' ? dto.bouquetId! : null,
      kind: dto.kind,
      description: dto.description ?? null,
      amountKopiyky: dto.amountKopiyky,
      incurredOn: dto.incurredOn,
      createdByUserId: user.id,
    });
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Expense not found');
    await this.repo.delete(id);
  }
}
