import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeeDto } from './dto/create-fee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly service: FeesService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.RESIDENT)
  @ApiOperation({ summary: 'Listar cuotas' })
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  findAll(
    @Query('condominiumId') condominiumId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAll(condominiumId, activeOnly === 'true');
  }

  @Get('condominium/:id')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.RESIDENT)
  @ApiOperation({ summary: 'Listar cuotas activas por condominio (CU-07)' })
  findByCondominium(@Param('id') id: string) {
    return this.service.findAll(id, true);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Crear cuota (CU-07)' })
  create(@Body() dto: CreateFeeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Editar cuota (CU-07)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateFeeDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Desactivar cuota' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
