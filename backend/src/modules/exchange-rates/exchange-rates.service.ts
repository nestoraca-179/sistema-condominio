import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from './exchange-rate.entity';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';

@Injectable()
export class ExchangeRatesService {
  constructor(@InjectRepository(ExchangeRate) private repo: Repository<ExchangeRate>) {}

  private getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async getByDate(date: string) {
    const rate = await this.repo.findOne({ where: { effective_date: date } });
    if (!rate) throw new NotFoundException(`No hay tasa de cambio registrada para la fecha ${date}`);
    return rate;
  }

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
    if (!Number.isFinite(dto.rate) || dto.rate <= 0) {
      throw new BadRequestException('La tasa debe ser un valor numérico mayor a 0');
    }

    if (dto.effective_date > this.getTodayDateString()) {
      throw new BadRequestException('La fecha de la tasa no puede ser superior a la actual');
    }

    const existingRate = await this.repo.findOne({
      where: { effective_date: dto.effective_date },
    });

    if (existingRate) {
      throw new BadRequestException('Ya existe una tasa de cambio registrada para esa fecha');
    }

    const rate = this.repo.create({ ...dto, registered_by: userId });
    return this.repo.save(rate);
  }
}
