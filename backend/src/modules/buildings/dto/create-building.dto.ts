import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuildingType } from '../building.entity';

export class CreateBuildingDto {
  @ApiProperty()
  @IsUUID()
  condominium_id: string;

  @ApiProperty({ example: 'Sector A' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({ enum: BuildingType })
  @IsEnum(BuildingType)
  type: BuildingType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order_index?: number;
}
