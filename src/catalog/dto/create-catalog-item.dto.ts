import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { catalogItemKind, unitOfMeasure } from '../../db/schema';

type Kind = (typeof catalogItemKind.enumValues)[number];
type Unit = (typeof unitOfMeasure.enumValues)[number];

export class CreateCatalogItemDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsIn([...catalogItemKind.enumValues])
  kind!: Kind;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsIn([...unitOfMeasure.enumValues])
  unit!: Unit;

  // Prices are integer kopiyky (1 UAH = 100).
  @IsInt()
  @Min(0)
  purchasePriceKopiyky!: number;

  @IsInt()
  @Min(0)
  salePriceKopiyky!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
