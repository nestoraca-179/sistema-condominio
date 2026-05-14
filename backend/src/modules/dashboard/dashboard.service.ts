import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtStatus } from '../debts/debt.entity';
import { Payment } from '../payments/payment.entity';
import { Fee } from '../fees/fee.entity';
import { Unit } from '../buildings/unit.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Fee) private feeRepo: Repository<Fee>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
  ) {}

  async getMyStatement(unitId: string) {
    const debts = await this.debtRepo.find({
      where: { unit_id: unitId },
      relations: ['fee'],
      order: { due_date: 'DESC' },
    });

    const payments = await this.paymentRepo.find({
      where: { unit_id: unitId },
      relations: ['fee'],
      order: { payment_date: 'DESC' },
    });

    const pendingDebts = debts.filter(d =>
      d.status === DebtStatus.PENDING || d.status === DebtStatus.PARTIAL,
    );
    const totalPendingVes = pendingDebts.reduce(
      (sum, d) => sum + Number(d.original_amount_ves) + Number(d.late_fee_ves) - Number(d.paid_amount_ves),
      0,
    );

    return {
      unit_id: unitId,
      debts,
      payments,
      summary: {
        total_pending_ves: totalPendingVes,
        pending_items: pendingDebts.length,
        last_payment: payments[0] || null,
      },
    };
  }

  async getAdminSummary(condominiumId: string) {
    const [totalUnits, activeFeesCount] = await Promise.all([
      this.unitRepo
        .createQueryBuilder('unit')
        .leftJoin('unit.building', 'building')
        .where('building.condominium_id = :condominiumId', { condominiumId })
        .getCount(),
      this.feeRepo.count({ where: { condominium_id: condominiumId, is_active: true } }),
    ]);

    const thisMonth = new Date();
    const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
      .toISOString().split('T')[0];

    const monthPayments = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoin('payment.unit', 'unit')
      .leftJoin('unit.building', 'building')
      .where('building.condominium_id = :condominiumId', { condominiumId })
      .andWhere('payment.payment_date >= :startOfMonth', { startOfMonth })
      .getMany();

    const monthCollectedVes = monthPayments.reduce((s, p) => s + Number(p.amount_ves), 0);

    return {
      total_units: totalUnits,
      active_fees: activeFeesCount,
      month_collected_ves: monthCollectedVes,
      month_payment_count: monthPayments.length,
    };
  }
}
