import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectPaymentDto {
  @ApiProperty({
    description: 'Motivo por el cual se rechaza el pago',
    example: 'El comprobante no coincide con el monto reportado',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
