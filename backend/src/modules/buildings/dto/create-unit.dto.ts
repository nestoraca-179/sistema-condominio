import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  building_id: string;

  @ApiProperty({ example: 'Apto 101' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 20)
  unit_number: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  owner_id?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_occupied?: boolean;
}
