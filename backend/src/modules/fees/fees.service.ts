import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fee, Currency } from './fee.entity';
import { CreateFeeDto } from './dto/create-fee.dto';

@Injectable()
export class FeesService {
  constructor(@InjectRepository(Fee) private repo: Repository<Fee>) {}

  async findAll(condominiumId?: string, activeOnly = false) {
    const where: any = {};
    if (condominiumId) where.condominium_id = condominiumId;
    if (activeOnly) where.is_active = true;
    return this.repo.find({ where, order: { created_at: 'DESC' } });
  }

  async findOne(id: string) {
    const fee = await this.repo.findOne({ where: { id } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');
    return fee;
  }

  async create(dto: CreateFeeDto) {
    const amount_ves =
      dto.currency === Currency.VES
        ? dto.amount_original
        : dto.amount_original * dto.exchange_rate;

    const fee = this.repo.create({ ...dto, amount_ves });
    return this.repo.save(fee);
  }

  async deactivate(id: string) {
    const fee = await this.repo.findOne({ where: { id } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');
    fee.is_active = false;
    return this.repo.save(fee);
  }
}
