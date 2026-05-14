import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID, Length, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FeeType, Currency } from '../fee.entity';

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
  @IsNumber()
  @IsPositive()
  amount_original: number;

  @ApiProperty({ description: 'Tasa de cambio VES/USD al momento', example: 36.50 })
  @IsNumber()
  @Min(0)
  exchange_rate: number;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  due_date: string;
}
