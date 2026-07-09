import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SaveFromBouquetDto {
  @IsUUID()
  bouquetId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
