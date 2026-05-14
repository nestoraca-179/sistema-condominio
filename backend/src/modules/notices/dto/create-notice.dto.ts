import {
  IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoticeTargetType } from '../notice.entity';

export class CreateNoticeDto {
  @ApiProperty()
  @IsUUID()
  condominium_id: string;

  @ApiProperty({ example: 'Corte de agua programado' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 200)
  title: string;

  @ApiProperty({ example: 'Se avisa a todos los residentes...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: NoticeTargetType })
  @IsEnum(NoticeTargetType)
  target_type: NoticeTargetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  target_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  send_by_email?: boolean;
}
