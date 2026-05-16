import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { Fee } from '../fees/fee.entity';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Fee, Unit, Building])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
