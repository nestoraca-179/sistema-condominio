import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Currency, Fee, FeeApplyScope } from '../fees/fee.entity';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private repo: Repository<Payment>,
    @InjectRepository(Fee) private feeRepo: Repository<Fee>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Building) private buildingRepo: Repository<Building>,
  ) {}

  private roundMoney(value: number) {
    return Number(value.toFixed(2));
  }

  private async getBuildingLineageIds(buildingId: string) {
    const lineage = new Set<string>();
    let currentId: string | null | undefined = buildingId;

    while (currentId) {
      lineage.add(currentId);
      const building = await this.buildingRepo.findOne({ where: { id: currentId } });
      currentId = building?.parent_id;
    }

    return lineage;
  }

  private getPaymentAmountInFeeCurrency(payment: Payment, feeCurrency: Currency) {
    if (feeCurrency === Currency.USD) {
      if (payment.amount_usd !== null && payment.amount_usd !== undefined) {
        return Number(payment.amount_usd);
      }

      if (payment.currency === Currency.USD) {
        return Number(payment.amount_original);
      }

      const exchangeRate = Number(payment.exchange_rate || 0);
      return exchangeRate > 0 ? this.roundMoney(Number(payment.amount_ves) / exchangeRate) : 0;
    }

    return Number(payment.amount_ves);
  }

  private async validateFeeApplicability(fee: Fee, unit: Unit) {
    if (fee.applies_to === FeeApplyScope.CONDOMINIUM) return;

    if (fee.applies_to === FeeApplyScope.UNIT) {
      if (fee.target_unit_id !== unit.id) {
        throw new BadRequestException('La cuota seleccionada no aplica a la unidad indicada');
      }
      return;
    }

    if (fee.applies_to === FeeApplyScope.BUILDING) {
      const lineage = await this.getBuildingLineageIds(unit.building_id);
      if (!fee.target_building_id || !lineage.has(fee.target_building_id)) {
        throw new BadRequestException('La cuota seleccionada no aplica a la estructura de la unidad indicada');
      }
    }
  }

  async create(dto: CreatePaymentDto, registeredBy: string) {
    const unit = await this.unitRepo.findOne({ where: { id: dto.unit_id }, relations: ['building'] });
    if (!unit || !unit.building) {
      throw new NotFoundException('Unidad no encontrada');
    }

    let fee: Fee | null = null;
    if (dto.fee_id) {
      fee = await this.feeRepo.findOne({ where: { id: dto.fee_id } });
      if (!fee) throw new NotFoundException('Cuota no encontrada');
      if (!fee.is_active) {
        throw new BadRequestException('La cuota seleccionada no está activa');
      }
      if (fee.condominium_id !== unit.building.condominium_id) {
        throw new BadRequestException('La cuota seleccionada no pertenece al condominio de la unidad');
      }
      await this.validateFeeApplicability(fee, unit);
    }

    const exchangeRate = Number(dto.exchange_rate || 0);
    const needsExchangeRate = dto.currency === Currency.USD || fee?.currency === Currency.USD;
    if (needsExchangeRate && exchangeRate <= 0) {
      throw new BadRequestException('Debe indicar una tasa de cambio válida para registrar el pago');
    }

    const amount_ves = dto.currency === Currency.VES
      ? this.roundMoney(dto.amount_original)
      : this.roundMoney(dto.amount_original * exchangeRate);

    const amount_usd = dto.currency === Currency.USD
      ? this.roundMoney(dto.amount_original)
      : exchangeRate > 0
        ? this.roundMoney(dto.amount_original / exchangeRate)
        : null;

    if (fee) {
      const previousPayments = await this.repo.find({
        where: { fee_id: fee.id, unit_id: dto.unit_id, is_voided: false },
      });

      const totalDueInFeeCurrency = fee.currency === Currency.USD
        ? Number(fee.amount_original)
        : Number(fee.amount_ves);
      const paidInFeeCurrency = previousPayments.reduce(
        (sum, payment) => sum + this.getPaymentAmountInFeeCurrency(payment, fee.currency),
        0,
      );
      const incomingInFeeCurrency = fee.currency === Currency.USD ? Number(amount_usd || 0) : Number(amount_ves);
      const remainingInFeeCurrency = this.roundMoney(totalDueInFeeCurrency - paidInFeeCurrency);

      if (remainingInFeeCurrency <= 0) {
        throw new BadRequestException('La cuota seleccionada ya fue pagada en su totalidad');
      }

      if (incomingInFeeCurrency - remainingInFeeCurrency > 0.01) {
        throw new BadRequestException(
          fee.currency === Currency.USD
            ? `El pago excede el saldo restante de la cuota. Saldo pendiente: ${remainingInFeeCurrency.toFixed(2)} USD`
            : `El pago excede el saldo restante de la cuota. Saldo pendiente: ${remainingInFeeCurrency.toFixed(2)} Bs.`,
        );
      }
    }

    const payment = this.repo.create({
      ...dto,
      amount_ves,
      amount_usd,
      registered_by: registeredBy,
    });
    return this.repo.save(payment);
  }

  async findByResident(unitId: string) {
    return this.repo.find({
      where: { unit_id: unitId },
      relations: ['fee', 'unit', 'unit.owner', 'voidedByUser'],
      order: { payment_date: 'DESC' },
    });
  }

  async voidPayment(id: string, userId: string, reason: string) {
    const payment = await this.repo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.is_voided) throw new BadRequestException('El pago ya fue anulado');
    const trimmedReason = reason?.trim();
    if (!trimmedReason) throw new BadRequestException('Debe indicar el motivo de la anulación');
    payment.is_voided = true;
    payment.voided_at = new Date();
    payment.voided_by = userId;
    payment.void_reason = trimmedReason;
    return this.repo.save(payment);
  }

  async findAll(condominiumId?: string) {
    const qb = this.repo.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('unit.owner', 'owner')
      .leftJoinAndSelect('payment.fee', 'fee')
      .leftJoinAndSelect('payment.registeredByUser', 'registeredBy')
      .leftJoinAndSelect('payment.voidedByUser', 'voidedByUser')
      .orderBy('payment.payment_date', 'DESC')
      .addOrderBy('payment.created_at', 'DESC');

    if (condominiumId) {
      qb.where('building.condominium_id = :condominiumId', { condominiumId });
    }
    return qb.getMany();
  }
}
