import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Currency } from '../fees/fee.entity';

@Injectable()
export class PaymentsService {
  constructor(@InjectRepository(Payment) private repo: Repository<Payment>) {}

  async create(dto: CreatePaymentDto, registeredBy: string) {
    const amount_ves =
      dto.currency === Currency.VES
        ? dto.amount_original
        : dto.amount_original * dto.exchange_rate;

    const payment = this.repo.create({
      ...dto,
      amount_ves,
      registered_by: registeredBy,
    });
    return this.repo.save(payment);
  }

  async findByResident(unitId: string) {
    return this.repo.find({
      where: { unit_id: unitId },
      relations: ['fee', 'unit'],
      order: { payment_date: 'DESC' },
    });
  }

  async findAll(condominiumId?: string) {
    const qb = this.repo.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('payment.fee', 'fee')
      .leftJoinAndSelect('payment.registeredByUser', 'registeredBy')
      .orderBy('payment.payment_date', 'DESC');

    if (condominiumId) {
      qb.where('building.condominium_id = :condominiumId', { condominiumId });
    }
    return qb.getMany();
  }
}
