import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsPositive,
  MinLength,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 'Monthly Food Budget' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  monthlyLimit!: number;

  @ApiProperty({ example: 4, description: '1-12' })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  year!: number;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsString()
  categoryId!: string;
}
