import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BouquetsRepository } from './bouquets.repository';
import { CatalogService } from '../catalog/catalog.service';
import { CreateBouquetDto } from './dto/create-bouquet.dto';
import { UpdateBouquetDto } from './dto/update-bouquet.dto';
import { AddLineDto } from './dto/add-line.dto';
import { UpdateLineDto } from './dto/update-line.dto';
import { SellBouquetDto } from './dto/sell-bouquet.dto';
import { pruneUndefined } from '../common/prune';
import { lineCostKopiyky, lineRevenueKopiyky, parseQuantity } from '../common/money';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { Bouquet, BouquetLine } from '../db/schema';

// Today's business date in Europe/Kyiv as YYYY-MM-DD (en-CA renders ISO order).
function todayKyiv(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date());
}

function withLineComputed(l: BouquetLine) {
  const quantity = parseQuantity(l.quantity);
  const cost = lineCostKopiyky(l.unitPurchasePriceKopiyky, quantity);
  const revenue = lineRevenueKopiyky(l.unitSalePriceKopiyky, quantity);
  return {
    ...l,
    quantity,
    lineCostKopiyky: cost,
    lineRevenueKopiyky: revenue,
    lineMarginKopiyky: revenue - cost,
  };
}

@Injectable()
export class BouquetsService {
  constructor(
    private readonly repo: BouquetsRepository,
    private readonly catalog: CatalogService,
  ) {}

  create(dto: CreateBouquetDto, user: AuthUser) {
    return this.repo.createBouquet(user.id, dto.title);
  }

  async list() {
    const [rows, profits] = await Promise.all([
      this.repo.listBouquets(),
      this.repo.listProfits(),
    ]);
    const byId = new Map(profits.map((p) => [p.bouquetId, p]));
    return rows.map((b) => ({ ...b, profit: byId.get(b.id) ?? null }));
  }

  async get(id: string) {
    const bouquet = await this.requireBouquet(id);
    const [lines, profit] = await Promise.all([
      this.repo.listLines(id),
      this.repo.getProfit(id),
    ]);
    return { ...bouquet, lines: lines.map(withLineComputed), profit };
  }

  async update(id: string, dto: UpdateBouquetDto) {
    const bouquet = await this.requireBouquet(id);
    if (bouquet.status === 'CANCELLED') {
      throw new ConflictException('Bouquet is cancelled');
    }
    const patch = pruneUndefined({
      title: dto.title,
      salePriceKopiyky: dto.salePriceKopiyky,
      discountKopiyky: dto.discountKopiyky,
      amountReceivedKopiyky: dto.amountReceivedKopiyky,
    });
    await this.repo.updateBouquet(id, patch);
    return this.get(id);
  }

  async remove(id: string) {
    const bouquet = await this.requireBouquet(id);
    if (bouquet.status !== 'DRAFT') {
      throw new ConflictException('Only DRAFT bouquets can be deleted; cancel it instead');
    }
    await this.repo.deleteBouquet(id);
  }

  // --- composition (DRAFT only) ---
  async addLine(bouquetId: string, dto: AddLineDto) {
    const bouquet = await this.requireBouquet(bouquetId);
    this.assertDraft(bouquet);

    let snapshot: {
      catalogItemId: string | null;
      itemNameSnapshot: string;
      unitSnapshot: BouquetLine['unitSnapshot'];
      unitPurchasePriceKopiyky: number;
      unitSalePriceKopiyky: number;
    };

    if (dto.catalogItemId) {
      const item = await this.catalog.get(dto.catalogItemId);
      snapshot = {
        catalogItemId: item.id,
        itemNameSnapshot: item.name,
        unitSnapshot: item.unit,
        unitPurchasePriceKopiyky: item.purchasePriceKopiyky,
        unitSalePriceKopiyky: item.salePriceKopiyky,
      };
    } else {
      if (
        !dto.itemName ||
        !dto.unit ||
        dto.purchasePriceKopiyky == null ||
        dto.salePriceKopiyky == null
      ) {
        throw new BadRequestException(
          'An ad-hoc line requires itemName, unit, purchasePriceKopiyky and salePriceKopiyky',
        );
      }
      snapshot = {
        catalogItemId: null,
        itemNameSnapshot: dto.itemName,
        unitSnapshot: dto.unit,
        unitPurchasePriceKopiyky: dto.purchasePriceKopiyky,
        unitSalePriceKopiyky: dto.salePriceKopiyky,
      };
    }

    await this.repo.addLine({ bouquetId, quantity: String(dto.quantity), ...snapshot });
    return this.get(bouquetId);
  }

  async updateLine(bouquetId: string, lineId: string, dto: UpdateLineDto) {
    const bouquet = await this.requireBouquet(bouquetId);
    this.assertDraft(bouquet);
    const line = await this.repo.findLine(lineId);
    if (!line || line.bouquetId !== bouquetId) throw new NotFoundException('Line not found');
    await this.repo.updateLineQuantity(lineId, String(dto.quantity));
    return this.get(bouquetId);
  }

  async removeLine(bouquetId: string, lineId: string) {
    const bouquet = await this.requireBouquet(bouquetId);
    this.assertDraft(bouquet);
    const line = await this.repo.findLine(lineId);
    if (!line || line.bouquetId !== bouquetId) throw new NotFoundException('Line not found');
    await this.repo.deleteLine(lineId);
    return this.get(bouquetId);
  }

  // --- status transitions ---
  async confirm(id: string) {
    const bouquet = await this.requireBouquet(id);
    if (bouquet.status !== 'DRAFT') {
      throw new ConflictException(`Cannot confirm a ${bouquet.status} bouquet`);
    }
    const salePrice = await this.resolveSalePrice(bouquet);
    await this.repo.updateBouquet(id, {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      salePriceKopiyky: salePrice,
    });
    return this.get(id);
  }

  async sell(id: string, dto: SellBouquetDto) {
    const bouquet = await this.requireBouquet(id);
    if (bouquet.status !== 'DRAFT' && bouquet.status !== 'CONFIRMED') {
      throw new ConflictException(`Cannot sell a ${bouquet.status} bouquet`);
    }
    const salePrice = await this.resolveSalePrice(bouquet);
    // Default cash = the full sum the client pays = the profit view's revenue
    // (flowers − discount + bouquet expenses). Fall back to the flower figure.
    const profit = await this.repo.getProfit(id);
    const defaultReceived =
      profit?.revenueKopiyky ?? Math.max(0, salePrice - bouquet.discountKopiyky);
    await this.repo.updateBouquet(id, {
      status: 'SOLD',
      soldOn: dto.soldOn ?? todayKyiv(),
      salePriceKopiyky: salePrice,
      amountReceivedKopiyky: dto.amountReceivedKopiyky ?? defaultReceived,
    });
    return this.get(id);
  }

  async cancel(id: string) {
    const bouquet = await this.requireBouquet(id);
    if (bouquet.status === 'SOLD') {
      throw new ConflictException('Cannot cancel a sold bouquet');
    }
    if (bouquet.status === 'CANCELLED') return this.get(id);
    await this.repo.updateBouquet(id, { status: 'CANCELLED' });
    return this.get(id);
  }

  // Clone a bouquet's composition into a fresh DRAFT (edit-a-confirmed-bouquet flow).
  async clone(id: string, user: AuthUser) {
    const bouquet = await this.requireBouquet(id);
    const lines = await this.repo.listLines(id);
    const draft = await this.repo.createBouquet(
      user.id,
      bouquet.title ? `${bouquet.title} (копія)` : null,
    );
    for (const l of lines) {
      await this.repo.addLine({
        bouquetId: draft.id,
        catalogItemId: l.catalogItemId,
        itemNameSnapshot: l.itemNameSnapshot,
        unitSnapshot: l.unitSnapshot,
        quantity: l.quantity,
        unitPurchasePriceKopiyky: l.unitPurchasePriceKopiyky,
        unitSalePriceKopiyky: l.unitSalePriceKopiyky,
      });
    }
    return this.get(draft.id);
  }

  private async resolveSalePrice(bouquet: Bouquet): Promise<number> {
    if (bouquet.salePriceKopiyky != null) return bouquet.salePriceKopiyky;
    const profit = await this.repo.getProfit(bouquet.id);
    return profit?.linesSaleTotalKopiyky ?? 0;
  }

  private async requireBouquet(id: string): Promise<Bouquet> {
    const bouquet = await this.repo.findBouquet(id);
    if (!bouquet) throw new NotFoundException('Bouquet not found');
    return bouquet;
  }

  private assertDraft(bouquet: Bouquet): void {
    if (bouquet.status !== 'DRAFT') {
      throw new ConflictException(
        `Bouquet is ${bouquet.status}; its lines are frozen. Clone it to a new draft to edit.`,
      );
    }
  }
}
