import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Debt } from '../debts/debt.entity';
import { Payment } from '../payments/payment.entity';
import { Fee } from '../fees/fee.entity';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';
import { ExchangeRate } from '../exchange-rates/exchange-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Debt, Payment, Fee, Unit, Building, ExchangeRate])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
