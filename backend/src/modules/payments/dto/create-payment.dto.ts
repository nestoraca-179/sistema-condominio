import {
  IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../fees/fee.entity';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  unit_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fee_id?: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ description: 'Monto en moneda original', example: 50 })
  @IsNumber()
  @IsPositive()
  amount_original: number;

  @ApiProperty({ description: 'Tasa de cambio del día del pago', example: 36.50 })
  @IsNumber()
  @Min(0)
  exchange_rate: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  payment_date: string;

  @ApiPropertyOptional({ example: '0001-2026' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
