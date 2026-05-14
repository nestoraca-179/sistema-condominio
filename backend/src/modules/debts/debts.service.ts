import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Debt, DebtStatus } from './debt.entity';
import { UpdateDebtDto } from './dto/update-debt.dto';

@Injectable()
export class DebtsService {
  constructor(@InjectRepository(Debt) private repo: Repository<Debt>) {}

  async findAll(condominiumId?: string, status?: DebtStatus) {
    const qb = this.repo.createQueryBuilder('debt')
      .leftJoinAndSelect('debt.unit', 'unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('unit.owner', 'owner')
      .leftJoinAndSelect('debt.fee', 'fee')
      .orderBy('debt.due_date', 'ASC');

    if (condominiumId) {
      qb.where('building.condominium_id = :condominiumId', { condominiumId });
    }
    if (status) {
      qb.andWhere('debt.status = :status', { status });
    }
    return qb.getMany();
  }

  async findByUnit(unitId: string) {
    return this.repo.find({
      where: { unit_id: unitId },
      relations: ['fee'],
      order: { due_date: 'DESC' },
    });
  }

  async update(id: string, dto: UpdateDebtDto) {
    const debt = await this.repo.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    Object.assign(debt, dto);
    // Auto-recalculate status
    const total = Number(debt.original_amount_ves) + Number(debt.late_fee_ves);
    if (Number(debt.paid_amount_ves) >= total) {
      debt.status = DebtStatus.PAID;
    } else if (Number(debt.paid_amount_ves) > 0) {
      debt.status = DebtStatus.PARTIAL;
    }
    return this.repo.save(debt);
  }

  async applyLateFee(id: string, lateFeeVes: number) {
    const debt = await this.repo.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    debt.late_fee_ves = Number(debt.late_fee_ves) + lateFeeVes;
    return this.repo.save(debt);
  }

  async waive(id: string) {
    const debt = await this.repo.findOne({ where: { id } });
    if (!debt) throw new NotFoundException('Deuda no encontrada');
    debt.status = DebtStatus.WAIVED;
    return this.repo.save(debt);
  }
}
