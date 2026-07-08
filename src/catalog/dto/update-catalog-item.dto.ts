import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { catalogItemKind, unitOfMeasure } from '../../db/schema';

type Kind = (typeof catalogItemKind.enumValues)[number];
type Unit = (typeof unitOfMeasure.enumValues)[number];

export class UpdateCatalogItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn([...catalogItemKind.enumValues])
  kind?: Kind;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsIn([...unitOfMeasure.enumValues])
  unit?: Unit;

  @IsOptional()
  @IsInt()
  @Min(0)
  purchasePriceKopiyky?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  salePriceKopiyky?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
