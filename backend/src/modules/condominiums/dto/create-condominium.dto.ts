import { IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCondominiumDto {
  @ApiProperty({ example: 'Residencias Las Palmas' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 150)
  name: string;

  @ApiProperty({ example: 'J-12345678-9' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  rif: string;

  @ApiProperty({ example: 'Av. Principal, Caracas, Venezuela' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  admin_user_id?: string;
}
