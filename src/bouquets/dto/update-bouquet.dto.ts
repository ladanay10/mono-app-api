import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBouquetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  // Override the final charged price (defaults to Σ line sale prices).
  @IsOptional()
  @IsInt()
  @Min(0)
  salePriceKopiyky?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  discountKopiyky?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountReceivedKopiyky?: number;
}
