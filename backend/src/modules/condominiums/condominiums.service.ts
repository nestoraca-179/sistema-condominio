import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Condominium } from './condominium.entity';
import { CreateCondominiumDto } from './dto/create-condominium.dto';
import { PartialType } from '@nestjs/mapped-types';

@Injectable()
export class CondominiumsService {
  constructor(
    @InjectRepository(Condominium) private repo: Repository<Condominium>,
  ) {}

  findAll() {
    return this.repo.find({ relations: ['admin_user'], order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const condo = await this.repo.findOne({ where: { id }, relations: ['admin_user'] });
    if (!condo) throw new NotFoundException('Condominio no encontrado');
    return condo;
  }

  async create(dto: CreateCondominiumDto) {
    const exists = await this.repo.findOne({ where: { rif: dto.rif } });
    if (exists) throw new ConflictException('Ya existe un condominio con ese RIF');
    const condo = this.repo.create(dto);
    return this.repo.save(condo);
  }

  async update(id: string, dto: Partial<CreateCondominiumDto> & { is_active?: boolean }) {
    const condo = await this.repo.findOne({ where: { id } });
    if (!condo) throw new NotFoundException('Condominio no encontrado');
    Object.assign(condo, dto);
    return this.repo.save(condo);
  }
}
