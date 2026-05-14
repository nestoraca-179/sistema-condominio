import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from './exchange-rate.entity';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(@InjectRepository(ExchangeRate) private repo: Repository<ExchangeRate>) {}

  async getLatest() {
    const rate = await this.repo.findOne({
      where: {},
      order: { effective_date: 'DESC', created_at: 'DESC' },
      relations: ['registeredByUser'],
    });
    if (!rate) throw new NotFoundException('No hay tasa de cambio registrada');
    return rate;
  }

  async getHistory() {
    return this.repo.find({
      relations: ['registeredByUser'],
      order: { effective_date: 'DESC' },
    });
  }

  async create(dto: CreateExchangeRateDto, userId: string) {
    const rate = this.repo.create({ ...dto, registered_by: userId });
    return this.repo.save(rate);
  }
}
