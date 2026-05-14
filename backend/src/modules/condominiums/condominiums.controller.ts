import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CondominiumsService } from './condominiums.service';
import { CreateCondominiumDto } from './dto/create-condominium.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Condominiums')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('condominiums')
export class CondominiumsController {
  constructor(private readonly service: CondominiumsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Listar condominios (CU-01)' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Crear condominio (CU-01)' })
  create(@Body() dto: CreateCondominiumDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN)
  @ApiOperation({ summary: 'Actualizar condominio' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCondominiumDto> & { is_active?: boolean }) {
    return this.service.update(id, dto);
  }
}
