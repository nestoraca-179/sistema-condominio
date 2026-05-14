import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DebtStatus } from '../debt.entity';

export class UpdateDebtDto {
  @ApiPropertyOptional({ enum: DebtStatus })
  @IsOptional()
  @IsEnum(DebtStatus)
  status?: DebtStatus;

  @ApiPropertyOptional({ description: 'Recargo por mora en VES' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  late_fee_ves?: number;

  @ApiPropertyOptional({ description: 'Monto abonado en VES' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount_ves?: number;
}
