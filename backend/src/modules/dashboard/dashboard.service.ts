import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtStatus } from '../debts/debt.entity';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { Fee, FeeApplyScope, Currency } from '../fees/fee.entity';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Fee) private feeRepo: Repository<Fee>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Building) private buildingRepo: Repository<Building>,
  ) {}

  private isApprovedPayment(payment: Payment) {
    return payment.status === PaymentStatus.APPROVED && !payment.is_voided;
  }

  private getTodayDateString() {
    return new Date().toISOString().split('T')[0];
  }

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private getPaymentAmountInFeeCurrency(payment: Payment, feeCurrency: Fee['currency']) {
    if (feeCurrency === Currency.USD) {
      if (payment.amount_usd !== null && payment.amount_usd !== undefined) {
        return Number(payment.amount_usd);
      }

      if (payment.currency === Currency.USD) {
        return Number(payment.amount_original);
      }

      const exchangeRate = Number(payment.exchange_rate || 0);
      return exchangeRate > 0
        ? this.roundMoney(Number(payment.amount_ves) / exchangeRate)
        : 0;
    }

    return Number(payment.amount_ves);
  }

  async getMyStatement(unitId: string) {
    const unit = await this.unitRepo.findOne({
      where: { id: unitId },
      relations: ['building', 'owner'],
    });

    if (!unit) {
      return {
        unit_id: unitId,
        debts: [],
        payments: [],
        pending_total_ves: 0,
        pending_total_usd: 0,
        total_paid_ves: 0,
        total_paid_usd: 0,
        summary: {
          total_pending_ves: 0,
          total_pending_usd: 0,
          total_paid_ves: 0,
          total_paid_usd: 0,
          pending_items: 0,
          overdue_items: 0,
          current_items: 0,
          last_payment: null,
        },
      };
    }

    const today = this.getTodayDateString();

    const [payments, storedDebts, fees, buildings] = await Promise.all([
      this.paymentRepo.find({
        where: { unit_id: unitId },
        relations: ['fee'],
        order: { payment_date: 'DESC' },
      }),
      this.debtRepo.find({
        where: { unit_id: unitId },
        relations: ['fee'],
        order: { due_date: 'DESC' },
      }),
      this.feeRepo.find({
        where: { condominium_id: unit.building?.condominium_id },
        relations: ['targetBuilding', 'targetUnit'],
        order: { due_date: 'DESC' },
      }),
      this.buildingRepo.find({
        where: { condominium_id: unit.building?.condominium_id },
      }),
    ]);

    const buildingsById = new Map(buildings.map(building => [building.id, building]));
    const unitLineage = new Set<string>();
    let currentBuildingId: string | undefined = unit.building_id;

    while (currentBuildingId) {
      unitLineage.add(currentBuildingId);
      currentBuildingId = buildingsById.get(currentBuildingId)?.parent_id ?? undefined;
    }

    const approvedPayments = payments.filter(payment => this.isApprovedPayment(payment));
    const approvedPaymentsByFeeId = approvedPayments.reduce<Record<string, Payment[]>>((accumulator, payment) => {
      if (!payment.fee_id) return accumulator;
      accumulator[payment.fee_id] = accumulator[payment.fee_id] || [];
      accumulator[payment.fee_id].push(payment);
      return accumulator;
    }, {});

    const storedDebtByFeeId = storedDebts.reduce<Record<string, Debt>>((accumulator, debt) => {
      accumulator[debt.fee_id] = debt;
      return accumulator;
    }, {});

    const applicableFees = fees.filter(fee => {
      if (fee.start_date && fee.start_date > today) return false;

      if (!fee.applies_to || fee.applies_to === FeeApplyScope.CONDOMINIUM) return true;
      if (fee.applies_to === FeeApplyScope.UNIT) return fee.target_unit_id === unit.id;
      if (fee.applies_to === FeeApplyScope.BUILDING) {
        return !!fee.target_building_id && unitLineage.has(fee.target_building_id);
      }

      return false;
    });

    const debts = applicableFees.flatMap(fee => {
      const storedDebt = storedDebtByFeeId[fee.id];
      const paidAmountVes = Number(
        storedDebt?.paid_amount_ves
        ?? approvedPaymentsByFeeId[fee.id]?.reduce((sum, payment) => sum + Number(payment.amount_ves || 0), 0)
        ?? 0,
      );
      const lateFeeVes = Number(storedDebt?.late_fee_ves ?? 0);
      const originalAmountVes = Number(storedDebt?.original_amount_ves ?? fee.amount_ves);
      const remainingAmountVes = Math.max(originalAmountVes + lateFeeVes - paidAmountVes, 0);
      const status = storedDebt?.status ?? (paidAmountVes > 0 ? DebtStatus.PARTIAL : DebtStatus.PENDING);

      if (
        status === DebtStatus.PAID
        || status === DebtStatus.WAIVED
        || remainingAmountVes <= 0.01
      ) {
        return [];
      }

      return [{
        id: storedDebt?.id ?? `${fee.id}:${unit.id}`,
        unit_id: unit.id,
        unit,
        fee_id: fee.id,
        fee,
        original_amount_ves: originalAmountVes,
        late_fee_ves: lateFeeVes,
        paid_amount_ves: paidAmountVes,
        status,
        due_date: storedDebt?.due_date ?? fee.due_date,
        updated_at: storedDebt?.updated_at ?? new Date(),
      } as Debt];
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));

    const pendingDebts = debts.filter(d =>
      d.status === DebtStatus.PENDING || d.status === DebtStatus.PARTIAL,
    );
    const totalPendingVes = pendingDebts.reduce(
      (sum, d) => sum + Number(d.original_amount_ves) + Number(d.late_fee_ves) - Number(d.paid_amount_ves),
      0,
    );
    const totalPendingUsd = pendingDebts.reduce((sum, debt) => {
      const remainingVes = Math.max(
        Number(debt.original_amount_ves) + Number(debt.late_fee_ves) - Number(debt.paid_amount_ves),
        0,
      );
      const debtExchangeRate = Number(debt.fee?.exchange_rate || 0);

      if (debt.fee?.currency === Currency.USD) {
        const paidInUsd = (approvedPaymentsByFeeId[debt.fee_id] || [])
          .reduce((paidSum, payment) => paidSum + this.getPaymentAmountInFeeCurrency(payment, Currency.USD), 0);
        const remainingUsd = Math.max(
          Number(debt.fee.amount_original) + (debtExchangeRate > 0 ? Number(debt.late_fee_ves) / debtExchangeRate : 0) - paidInUsd,
          0,
        );
        return sum + remainingUsd;
      }

      return sum + (debtExchangeRate > 0 ? remainingVes / debtExchangeRate : 0);
    }, 0);
    const totalPaidVes = approvedPayments
      .reduce((sum, payment) => sum + Number(payment.amount_ves || 0), 0);
    const totalPaidUsd = approvedPayments
      .reduce((sum, payment) => sum + Number(payment.amount_usd || 0), 0);
    const overdueItems = pendingDebts.filter(debt => debt.due_date < today).length;
    const currentItems = Math.max(pendingDebts.length - overdueItems, 0);

    return {
      unit_id: unitId,
      debts,
      payments,
      pending_total_ves: totalPendingVes,
      pending_total_usd: this.roundMoney(totalPendingUsd),
      total_paid_ves: totalPaidVes,
      total_paid_usd: totalPaidUsd,
      summary: {
        total_pending_ves: totalPendingVes,
        total_pending_usd: this.roundMoney(totalPendingUsd),
        total_paid_ves: totalPaidVes,
        total_paid_usd: totalPaidUsd,
        pending_items: pendingDebts.length,
        overdue_items: overdueItems,
        current_items: currentItems,
        last_payment: approvedPayments[0] || null,
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
      .andWhere('payment.status = :approvedStatus', { approvedStatus: PaymentStatus.APPROVED })
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
