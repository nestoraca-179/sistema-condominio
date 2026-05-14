import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Payment } from '../payments/payment.entity';
import { Debt } from '../debts/debt.entity';
import { Unit } from '../buildings/unit.entity';
import { Fee } from '../fees/fee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Debt, Unit, Fee])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
