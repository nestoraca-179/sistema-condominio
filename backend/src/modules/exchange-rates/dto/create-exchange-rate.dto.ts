import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExchangeRateDto {
  @ApiProperty({ description: '1 USD = X VES', example: 36.5 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rate: number;

  @ApiProperty({ example: '2026-05-13' })
  @IsDateString()
  effective_date: string;
}
