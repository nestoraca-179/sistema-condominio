import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeType, Currency, FeeApplyScope } from '../fee.entity';

export class CreateFeeDto {
  @ApiProperty()
  @IsUUID()
  condominium_id: string;

  @ApiProperty({ example: 'Mantenimiento Junio 2026' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  name: string;

  @ApiProperty({ enum: FeeType })
  @IsEnum(FeeType)
  type: FeeType;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ description: 'Monto en moneda original', example: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount_original: number;

  @ApiProperty({ description: 'Tasa de cambio VES/USD al momento', example: 36.50 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  exchange_rate: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  due_date: string;

  @ApiProperty({ enum: FeeApplyScope, default: FeeApplyScope.CONDOMINIUM })
  @IsEnum(FeeApplyScope)
  applies_to: FeeApplyScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  target_building_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  target_unit_id?: string;
}
