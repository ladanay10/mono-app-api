import { IsInt, IsOptional, Matches, Min } from 'class-validator';

export class SellBouquetDto {
  // Business date YYYY-MM-DD; defaults to today (Europe/Kyiv).
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'soldOn must be YYYY-MM-DD' })
  soldOn?: string;

  // Cash actually collected; defaults to the full revenue.
  @IsOptional()
  @IsInt()
  @Min(0)
  amountReceivedKopiyky?: number;
}
