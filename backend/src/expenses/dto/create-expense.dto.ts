import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 45.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Grocery shopping at Walmart' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-04-10T00:00:00.000Z' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ example: 'uuid-of-budget' })
  @IsOptional()
  @IsString()
  budgetId?: string;
}
