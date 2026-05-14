import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment } from '../payments/payment.entity';
import { Debt } from '../debts/debt.entity';
import { Unit } from '../buildings/unit.entity';
import { Fee } from '../fees/fee.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Fee) private feeRepo: Repository<Fee>,
  ) {}

  async getFinancialReport(condominiumId: string, startDate: string, endDate: string) {
    const payments = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('payment.fee', 'fee')
      .where('building.condominium_id = :condominiumId', { condominiumId })
      .andWhere('payment.payment_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('payment.payment_date', 'ASC')
      .getMany();

    const totalVes = payments.reduce((sum, p) => sum + Number(p.amount_ves), 0);
    const totalUsd = payments.reduce((sum, p) => sum + Number(p.amount_original), 0);

    const pendingDebts = await this.debtRepo
      .createQueryBuilder('debt')
      .leftJoinAndSelect('debt.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .where('building.condominium_id = :condominiumId', { condominiumId })
      .andWhere("debt.status IN ('pending', 'partial')")
      .getMany();

    const totalPendingVes = pendingDebts.reduce(
      (sum, d) => sum + Number(d.original_amount_ves) + Number(d.late_fee_ves) - Number(d.paid_amount_ves),
      0,
    );

    return {
      period: { startDate, endDate },
      payments,
      summary: {
        total_collected_ves: totalVes,
        total_collected_usd: totalUsd,
        total_pending_ves: totalPendingVes,
        payment_count: payments.length,
      },
    };
  }

  async getGlobalStatement(condominiumId: string, year?: number, month?: number) {
    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('unit.owner', 'owner')
      .leftJoinAndSelect('payment.fee', 'fee')
      .where('building.condominium_id = :condominiumId', { condominiumId });

    if (year) {
      qb.andWhere('EXTRACT(YEAR FROM payment.payment_date) = :year', { year });
    }
    if (month) {
      qb.andWhere('EXTRACT(MONTH FROM payment.payment_date) = :month', { month });
    }

    const payments = await qb.orderBy('payment.payment_date', 'DESC').getMany();

    const byUnit = payments.reduce((acc, p) => {
      const key = p.unit?.unit_number || p.unit_id;
      if (!acc[key]) acc[key] = { unit: p.unit, total_ves: 0, total_usd: 0, payments: [] };
      acc[key].total_ves += Number(p.amount_ves);
      acc[key].total_usd += Number(p.amount_original);
      acc[key].payments.push(p);
      return acc;
    }, {} as Record<string, any>);

    return {
      year,
      month,
      by_unit: Object.values(byUnit),
      grand_total_ves: payments.reduce((s, p) => s + Number(p.amount_ves), 0),
    };
  }
}
