import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { Fee } from './fee.entity';
import { Building } from '../buildings/building.entity';
import { Unit } from '../buildings/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fee, Building, Unit])],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}
