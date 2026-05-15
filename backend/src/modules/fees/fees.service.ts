import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from '../buildings/building.entity';
import { Unit } from '../buildings/unit.entity';
import { Fee, Currency, FeeApplyScope } from './fee.entity';
import { CreateFeeDto } from './dto/create-fee.dto';

@Injectable()
export class FeesService {
  constructor(
    @InjectRepository(Fee) private repo: Repository<Fee>,
    @InjectRepository(Building) private buildingRepo: Repository<Building>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
  ) {}

  async findAll(condominiumId?: string, activeOnly = false) {
    const qb = this.repo.createQueryBuilder('fee')
      .leftJoinAndSelect('fee.targetBuilding', 'targetBuilding')
      .leftJoinAndSelect('fee.targetUnit', 'targetUnit')
      .leftJoinAndSelect('targetUnit.building', 'targetUnitBuilding')
      .orderBy('fee.created_at', 'DESC');

    if (condominiumId) {
      qb.where('fee.condominium_id = :condominiumId', { condominiumId });
    }
    if (activeOnly) {
      qb.andWhere('fee.is_active = true');
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    const fee = await this.repo.findOne({
      where: { id },
      relations: ['targetBuilding', 'targetUnit', 'targetUnit.building'],
    });
    if (!fee) throw new NotFoundException('Cuota no encontrada');
    return fee;
  }

  async create(dto: CreateFeeDto) {
    if (dto.start_date > dto.due_date) {
      throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de vencimiento');
    }

    const payload: CreateFeeDto = {
      ...dto,
      target_building_id: dto.target_building_id || undefined,
      target_unit_id: dto.target_unit_id || undefined,
    };

    if (payload.applies_to === FeeApplyScope.CONDOMINIUM) {
      payload.target_building_id = undefined;
      payload.target_unit_id = undefined;
    }

    if (payload.applies_to === FeeApplyScope.BUILDING) {
      if (!payload.target_building_id) {
        throw new BadRequestException('Debe seleccionar el sector, torre o edificio al que aplica la cuota');
      }

      const building = await this.buildingRepo.findOne({ where: { id: payload.target_building_id } });
      if (!building || building.condominium_id !== payload.condominium_id) {
        throw new BadRequestException('La estructura seleccionada no pertenece al condominio');
      }

      payload.target_unit_id = undefined;
    }

    if (payload.applies_to === FeeApplyScope.UNIT) {
      if (!payload.target_unit_id) {
        throw new BadRequestException('Debe seleccionar la unidad a la que aplica la cuota');
      }

      const unit = await this.unitRepo.findOne({
        where: { id: payload.target_unit_id },
        relations: ['building'],
      });
      if (!unit || unit.building?.condominium_id !== payload.condominium_id) {
        throw new BadRequestException('La unidad seleccionada no pertenece al condominio');
      }

      payload.target_building_id = undefined;
    }

    const amount_ves =
      payload.currency === Currency.VES
        ? payload.amount_original
        : payload.amount_original * payload.exchange_rate;

    const fee = this.repo.create({ ...payload, amount_ves });
    return this.repo.save(fee);
  }

  async update(id: string, dto: Partial<CreateFeeDto>) {
    const fee = await this.repo.findOne({ where: { id } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');

    if (dto.start_date && dto.due_date && dto.start_date > dto.due_date) {
      throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de vencimiento');
    }

    const updatedCurrency = dto.currency ?? fee.currency;
    const updatedAmountOriginal = dto.amount_original !== undefined ? dto.amount_original : Number(fee.amount_original);
    const updatedExchangeRate = dto.exchange_rate !== undefined ? dto.exchange_rate : Number(fee.exchange_rate);

    const amount_ves = updatedCurrency === Currency.VES
      ? updatedAmountOriginal
      : updatedAmountOriginal * updatedExchangeRate;

    // Clear target fields that no longer apply
    const updatedScope = dto.applies_to ?? fee.applies_to;
    const patchedDto: Partial<CreateFeeDto> = {
      ...dto,
      target_building_id: updatedScope === FeeApplyScope.BUILDING ? (dto.target_building_id ?? fee.target_building_id) : undefined,
      target_unit_id: updatedScope === FeeApplyScope.UNIT ? (dto.target_unit_id ?? fee.target_unit_id) : undefined,
    };

    Object.assign(fee, patchedDto, { amount_ves });
    return this.repo.save(fee);
  }

  async deactivate(id: string) {
    const fee = await this.repo.findOne({ where: { id } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');
    fee.is_active = false;
    return this.repo.save(fee);
  }
}
