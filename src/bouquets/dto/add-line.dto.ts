import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { unitOfMeasure } from '../../db/schema';

type Unit = (typeof unitOfMeasure.enumValues)[number];

// Two modes:
//  - catalog line: provide catalogItemId (prices snapshot from the catalog).
//  - ad-hoc line:  provide itemName + unit + both prices (no catalog row).
export class AddLineDto {
  @IsOptional()
  @IsUUID()
  catalogItemId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  itemName?: string;

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

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}
