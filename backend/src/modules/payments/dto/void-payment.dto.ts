import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidPaymentDto {
  @ApiProperty({
    description: 'Motivo por el cual se anula el pago',
    example: 'Transferencia duplicada registrada por error',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
