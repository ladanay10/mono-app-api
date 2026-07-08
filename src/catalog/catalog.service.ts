import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogRepository } from './catalog.repository';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import type { CatalogItem } from '../db/schema';

@Injectable()
export class CatalogService {
  constructor(private readonly repo: CatalogRepository) {}

  list(includeInactive = false): Promise<CatalogItem[]> {
    return this.repo.list(includeInactive);
  }

  async get(id: string): Promise<CatalogItem> {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Catalog item not found');
    return item;
  }

  create(dto: CreateCatalogItemDto, user: AuthUser): Promise<CatalogItem> {
    return this.repo.create({ ...dto, createdByUserId: user.id });
  }

  async update(id: string, dto: UpdateCatalogItemDto): Promise<CatalogItem> {
    await this.get(id);
    const updated = await this.repo.update(id, dto);
    return updated!;
  }

  // Soft delete — the item is never hard-deleted so past bouquet lines keep their FK.
  async archive(id: string): Promise<CatalogItem> {
    await this.get(id);
    const updated = await this.repo.update(id, { isActive: false });
    return updated!;
  }
}
