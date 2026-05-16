import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { Building } from './building.entity';
import { Unit } from './unit.entity';
import { Payment } from '../payments/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Building, Unit, Payment])],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService, TypeOrmModule],
})
export class BuildingsModule {}
