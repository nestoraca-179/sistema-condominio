import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtStatus } from '../debts/debt.entity';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { Fee, FeeApplyScope, Currency, FeeType } from '../fees/fee.entity';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';
import { ExchangeRate } from '../exchange-rates/exchange-rate.entity';

@Injectable()
export class DashboardService {
  private readonly monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  constructor(
    @InjectRepository(Debt) private debtRepo: Repository<Debt>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Fee) private feeRepo: Repository<Fee>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Building) private buildingRepo: Repository<Building>,
    @InjectRepository(ExchangeRate) private exchangeRateRepo: Repository<ExchangeRate>,
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

  private getOutstandingAmount(debt: Pick<Debt, 'original_amount_ves' | 'late_fee_ves' | 'paid_amount_ves'>) {
    return Math.max(
      Number(debt.original_amount_ves) + Number(debt.late_fee_ves) - Number(debt.paid_amount_ves),
      0,
    );
  }

  private getMonthKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getMonthLabel(date: Date, includeYear = false) {
    const label = this.monthLabels[date.getMonth()];
    return includeYear ? `${label} ${date.getFullYear()}` : label;
  }

  private getRollingMonths(count: number) {
    const months: Array<{ key: string; label: string }> = [];
    const base = new Date();

    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(base.getFullYear(), base.getMonth() - index, 1);
      months.push({
        key: this.getMonthKey(date),
        label: this.getMonthLabel(date, count > 6),
      });
    }

    return months;
  }

  private getYearMonths(year: number) {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const date = new Date(year, monthIndex, 1);
      return {
        key: this.getMonthKey(date),
        label: this.getMonthLabel(date),
      };
    });
  }

  private getDaysOverdue(dueDate: string, today: string) {
    const due = new Date(`${dueDate}T00:00:00`);
    const current = new Date(`${today}T00:00:00`);
    const diff = current.getTime() - due.getTime();
    return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
  }

  private getLatestExchangeRate() {
    return this.exchangeRateRepo
      .createQueryBuilder('exchangeRate')
      .orderBy('exchangeRate.effective_date', 'DESC')
      .addOrderBy('exchangeRate.created_at', 'DESC')
      .getOne();
  }

  private getRecentExchangeRates(limit = 10) {
    return this.exchangeRateRepo
      .createQueryBuilder('exchangeRate')
      .orderBy('exchangeRate.effective_date', 'DESC')
      .addOrderBy('exchangeRate.created_at', 'DESC')
      .limit(limit)
      .getMany();
  }

  private async getCondominiumPayments(condominiumId: string) {
    return this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('payment.fee', 'fee')
      .where('building.condominium_id = :condominiumId', { condominiumId })
      .orderBy('payment.created_at', 'ASC')
      .getMany();
  }

  private async getCondominiumDebts(condominiumId: string) {
    return this.debtRepo
      .createQueryBuilder('debt')
      .leftJoinAndSelect('debt.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('debt.fee', 'fee')
      .where('building.condominium_id = :condominiumId', { condominiumId })
      .andWhere('debt.status IN (:...statuses)', { statuses: [DebtStatus.PENDING, DebtStatus.PARTIAL] })
      .getMany();
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

  async getAdminDashboard(condominiumId: string) {
    const today = this.getTodayDateString();
    const rollingMonths = this.getRollingMonths(6);

    const [summary, units, fees, payments, debts] = await Promise.all([
      this.getAdminSummary(condominiumId),
      this.unitRepo
        .createQueryBuilder('unit')
        .leftJoinAndSelect('unit.building', 'building')
        .where('building.condominium_id = :condominiumId', { condominiumId })
        .getMany(),
      this.feeRepo.find({ where: { condominium_id: condominiumId } }),
      this.getCondominiumPayments(condominiumId),
      this.getCondominiumDebts(condominiumId),
    ]);

    const occupancy = [
      {
        name: 'Ocupadas',
        value: units.filter(unit => unit.is_occupied || !!unit.owner_id).length,
      },
      {
        name: 'Disponibles',
        value: units.filter(unit => !unit.is_occupied && !unit.owner_id).length,
      },
    ];

    const feeTypeStatusMap = {
      [FeeType.ORDINARY]: { name: 'Ordinarias', activas: 0, inactivas: 0 },
      [FeeType.EXTRAORDINARY]: { name: 'Extraordinarias', activas: 0, inactivas: 0 },
    };

    fees.forEach(fee => {
      const bucket = feeTypeStatusMap[fee.type] || { name: fee.type, activas: 0, inactivas: 0 };
      if (fee.is_active) {
        bucket.activas += 1;
      } else {
        bucket.inactivas += 1;
      }
      feeTypeStatusMap[fee.type] = bucket;
    });

    const feeStatus = Object.values(feeTypeStatusMap);

    const paymentFlowMap = rollingMonths.reduce<Record<string, { month: string; aprobados: number; pendientes: number; rechazados: number }>>((accumulator, month) => {
      accumulator[month.key] = {
        month: month.label,
        aprobados: 0,
        pendientes: 0,
        rechazados: 0,
      };
      return accumulator;
    }, {});

    payments.forEach(payment => {
      const monthKey = this.getMonthKey(new Date(payment.created_at || payment.payment_date));
      const month = paymentFlowMap[monthKey];
      if (!month) return;

      if (payment.status === PaymentStatus.APPROVED) {
        month.aprobados += 1;
      } else if (payment.status === PaymentStatus.PENDING) {
        month.pendientes += 1;
      } else if (payment.status === PaymentStatus.REJECTED) {
        month.rechazados += 1;
      }
    });

    const paymentFlow = rollingMonths.map(month => paymentFlowMap[month.key]);

    const delinquencyByBuildingMap = debts.reduce<Record<string, { name: string; pendientes: number; mora: number }>>((accumulator, debt) => {
      const name = debt.unit?.building?.name || 'Sin edificio';
      const bucket = accumulator[name] || { name, pendientes: 0, mora: 0 };
      const amount = this.getOutstandingAmount(debt);

      if (debt.due_date < today) {
        bucket.mora += amount;
      } else {
        bucket.pendientes += amount;
      }

      accumulator[name] = bucket;
      return accumulator;
    }, {});

    const delinquencyByBuilding = Object.values(delinquencyByBuildingMap)
      .sort((left, right) => (right.mora + right.pendientes) - (left.mora + left.pendientes))
      .slice(0, 6)
      .map(item => ({
        ...item,
        pendientes: this.roundMoney(item.pendientes),
        mora: this.roundMoney(item.mora),
      }));

    return {
      summary,
      charts: {
        occupancy,
        fee_status: feeStatus,
        payment_flow: paymentFlow,
        delinquency_by_building: delinquencyByBuilding,
      },
    };
  }

  async getAccountantDashboard(condominiumId: string) {
    const today = this.getTodayDateString();
    const currentYear = new Date().getFullYear();
    const months = this.getYearMonths(currentYear);

    const [summary, latestExchangeRate, approvedPayments, debts, recentRates] = await Promise.all([
      this.getAdminSummary(condominiumId),
      this.getLatestExchangeRate(),
      this.getCondominiumPayments(condominiumId),
      this.getCondominiumDebts(condominiumId),
      this.getRecentExchangeRates(),
    ]);

    const approvedOnlyPayments = approvedPayments.filter(payment => this.isApprovedPayment(payment));
    const currentYearPayments = approvedOnlyPayments.filter(payment => {
      const paymentDate = new Date(`${payment.payment_date}T00:00:00`);
      return paymentDate.getFullYear() === currentYear;
    });

    const collectionTrendMap = months.reduce<Record<string, { month: string; ves: number; usd: number }>>((accumulator, month) => {
      accumulator[month.key] = { month: month.label, ves: 0, usd: 0 };
      return accumulator;
    }, {});

    currentYearPayments.forEach(payment => {
      const key = this.getMonthKey(new Date(`${payment.payment_date}T00:00:00`));
      const bucket = collectionTrendMap[key];
      if (!bucket) return;

      bucket.ves += Number(payment.amount_ves || 0);
      bucket.usd += this.getPaymentAmountInFeeCurrency(payment, Currency.USD);
    });

    const collectionTrend = months.map(month => ({
      ...collectionTrendMap[month.key],
      ves: this.roundMoney(collectionTrendMap[month.key].ves),
      usd: this.roundMoney(collectionTrendMap[month.key].usd),
    }));

    const feeTypeBreakdownMap = currentYearPayments.reduce<Record<string, { name: string; value: number }>>((accumulator, payment) => {
      const key = payment.fee?.type === FeeType.EXTRAORDINARY ? 'Cuotas extraordinarias' : payment.fee?.type === FeeType.ORDINARY ? 'Cuotas ordinarias' : 'Pagos generales';
      const bucket = accumulator[key] || { name: key, value: 0 };
      bucket.value += Number(payment.amount_ves || 0);
      accumulator[key] = bucket;
      return accumulator;
    }, {});

    const feeTypeBreakdown = Object.values(feeTypeBreakdownMap).map(item => ({
      ...item,
      value: this.roundMoney(item.value),
    }));

    const topUnitsMap = currentYearPayments.reduce<Record<string, { unit: string; total: number }>>((accumulator, payment) => {
      const unitLabel = payment.unit?.building?.name
        ? `${payment.unit.unit_number} · ${payment.unit.building.name}`
        : payment.unit?.unit_number || payment.unit_id;
      const bucket = accumulator[unitLabel] || { unit: unitLabel, total: 0 };
      bucket.total += Number(payment.amount_ves || 0);
      accumulator[unitLabel] = bucket;
      return accumulator;
    }, {});

    const topUnits = Object.values(topUnitsMap)
      .sort((left, right) => right.total - left.total)
      .slice(0, 8)
      .map(item => ({ ...item, total: this.roundMoney(item.total) }));

    const agingBuckets = [
      { name: 'Al día', minDays: 0, maxDays: 0, amount: 0 },
      { name: '1-30 días', minDays: 1, maxDays: 30, amount: 0 },
      { name: '31-60 días', minDays: 31, maxDays: 60, amount: 0 },
      { name: '61+ días', minDays: 61, maxDays: Number.POSITIVE_INFINITY, amount: 0 },
    ];

    debts.forEach(debt => {
      const amount = this.getOutstandingAmount(debt);
      const daysOverdue = this.getDaysOverdue(debt.due_date, today);
      const bucket = agingBuckets.find(item => daysOverdue >= item.minDays && daysOverdue <= item.maxDays);
      if (!bucket) return;
      bucket.amount += amount;
    });

    const accountsReceivableAging = agingBuckets.map(item => ({
      name: item.name,
      amount: this.roundMoney(item.amount),
    }));

    const exchangeRateTrend = recentRates
      .slice()
      .reverse()
      .map(rate => ({
        date: rate.effective_date,
        rate: Number(rate.rate),
      }));

    return {
      summary,
      latest_exchange_rate: latestExchangeRate,
      charts: {
        collection_trend: collectionTrend,
        fee_type_breakdown: feeTypeBreakdown,
        top_units: topUnits,
        accounts_receivable_aging: accountsReceivableAging,
        exchange_rate_trend: exchangeRateTrend,
      },
    };
  }
}
