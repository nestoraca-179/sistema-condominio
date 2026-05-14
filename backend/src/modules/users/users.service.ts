import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
  ) {}

  private normalizeUsername(value: string) {
    const normalized = value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '')
      .toLowerCase();

    return (normalized || 'usuario').slice(0, 40);
  }

  private async usernameExists(username: string, excludeUserId?: string) {
    const existing = await this.repo.findOne({ where: { username } });
    return !!existing && existing.id !== excludeUserId;
  }

  private async generateUniqueUsername(base: string, excludeUserId?: string) {
    const normalizedBase = this.normalizeUsername(base);
    let candidate = normalizedBase;
    let counter = 1;

    while (await this.usernameExists(candidate, excludeUserId)) {
      const suffix = `.${counter}`;
      candidate = `${normalizedBase.slice(0, 40 - suffix.length)}${suffix}`;
      counter += 1;
    }

    return candidate;
  }

  async findAll(condominiumId?: string) {
    const where: any = {};
    if (condominiumId) where.condominium_id = condominiumId;
    const users = await this.repo.find({ where, relations: ['condominium'] });
    return users.map(({ password_hash, ...u }) => u);
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id }, relations: ['condominium'] });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { password_hash, ...result } = user;
    return result;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const username = dto.username
      ? this.normalizeUsername(dto.username)
      : await this.generateUniqueUsername(dto.full_name || dto.email.split('@')[0]);

    if (await this.usernameExists(username)) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.repo.create({
      ...dto,
      username,
      password_hash: hash,
    });
    const saved = await this.repo.save(user);
    const { password_hash, ...result } = saved;
    return result;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.repo.findOne({ where: { email: dto.email } });
      if (emailExists) throw new ConflictException('El email ya está registrado');
    }

    if (dto.username) {
      const normalizedUsername = this.normalizeUsername(dto.username);
      if (await this.usernameExists(normalizedUsername, user.id)) {
        throw new ConflictException('El nombre de usuario ya está registrado');
      }
      dto.username = normalizedUsername;
    } else if (!user.username) {
      dto.username = await this.generateUniqueUsername(dto.full_name || user.full_name || user.email.split('@')[0], user.id);
    }

    if (dto.password) {
      (dto as any).password_hash = await bcrypt.hash(dto.password, 12);
      delete dto.password;
    }

    Object.assign(user, dto);
    const saved = await this.repo.save(user);
    const { password_hash, ...result } = saved;
    return result;
  }

  async deactivate(id: string) {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.is_active = false;
    await this.repo.save(user);
    return { message: 'Usuario desactivado' };
  }
}
