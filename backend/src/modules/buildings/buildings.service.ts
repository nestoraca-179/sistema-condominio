import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { Unit } from './unit.entity';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateUnitDto } from './dto/create-unit.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building) private buildingRepo: Repository<Building>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
  ) {}

  async getSectors(condominiumId: string) {
    return this.buildingRepo.find({
      where: { condominium_id: condominiumId },
      relations: ['parent'],
      order: { order_index: 'ASC', name: 'ASC' },
    });
  }

  async createBuilding(dto: CreateBuildingDto) {
    const building = this.buildingRepo.create(dto);
    return this.buildingRepo.save(building);
  }

  async updateBuilding(id: string, dto: Partial<CreateBuildingDto>) {
    const b = await this.buildingRepo.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Sector/Edificio no encontrado');
    Object.assign(b, dto);
    return this.buildingRepo.save(b);
  }

  async deleteBuilding(id: string) {
    const building = await this.buildingRepo.findOne({ where: { id } });
    if (!building) throw new NotFoundException('Sector/Edificio no encontrado');

    const [childrenCount, unitsCount] = await Promise.all([
      this.buildingRepo.count({ where: { parent_id: id } }),
      this.unitRepo.count({ where: { building_id: id } }),
    ]);

    if (childrenCount > 0) {
      throw new BadRequestException('No se puede eliminar porque este elemento es padre de otros');
    }

    if (unitsCount > 0) {
      throw new BadRequestException('No se puede eliminar porque este elemento tiene unidades asociadas');
    }

    await this.buildingRepo.remove(building);
    return { success: true };
  }

  async getUnits(condominiumId?: string, buildingId?: string) {
    const qb = this.unitRepo.createQueryBuilder('unit')
      .leftJoinAndSelect('unit.building', 'building')
      .leftJoinAndSelect('unit.owner', 'owner');
    if (buildingId) qb.where('unit.building_id = :buildingId', { buildingId });
    if (condominiumId) qb.andWhere('building.condominium_id = :condominiumId', { condominiumId });
    return qb.getMany();
  }

  async findUnit(id: string) {
    const unit = await this.unitRepo.findOne({
      where: { id },
      relations: ['building', 'owner'],
    });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    return unit;
  }

  async createUnit(dto: CreateUnitDto) {
    const unit = this.unitRepo.create(dto);
    return this.unitRepo.save(unit);
  }

  async updateUnit(id: string, dto: Partial<CreateUnitDto>) {
    const unit = await this.unitRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    Object.assign(unit, dto);
    return this.unitRepo.save(unit);
  }

  async deleteUnit(id: string) {
    const unit = await this.unitRepo.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    await this.unitRepo.remove(unit);
    return { success: true };
  }
}
