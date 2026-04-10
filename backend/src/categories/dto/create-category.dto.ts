import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Food & Dining' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: '🍕' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: '#FF5722' })
  @IsOptional()
  @IsString()
  color?: string;
}
