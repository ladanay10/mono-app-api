import { IsNumber, Min } from 'class-validator';

export class UpdateLineDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}
