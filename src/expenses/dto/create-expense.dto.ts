import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { expenseKind, expenseScope } from '../../db/schema';

type Scope = (typeof expenseScope.enumValues)[number];
type Kind = (typeof expenseKind.enumValues)[number];

export class CreateExpenseDto {
  @IsIn([...expenseScope.enumValues])
  scope!: Scope;

  // Required when scope=BOUQUET, forbidden when scope=GENERAL (enforced in the service + DB).
  @IsOptional()
  @IsUUID()
  bouquetId?: string;

  @IsIn([...expenseKind.enumValues])
  kind!: Kind;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  amountKopiyky!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'incurredOn must be YYYY-MM-DD' })
  incurredOn!: string;
}
