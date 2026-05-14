import { Controller, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DebtsService } from './debts.service';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtStatus } from './debt.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Debts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly service: DebtsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Listar deudas/moras (CU-09)' })
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: DebtStatus })
  findAll(
    @Query('condominiumId') condominiumId?: string,
    @Query('status') status?: DebtStatus,
  ) {
    return this.service.findAll(condominiumId, status);
  }

  @Get('unit/:unitId')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.RESIDENT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Deudas de una unidad' })
  findByUnit(@Param('unitId') unitId: string) {
    return this.service.findByUnit(unitId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Actualizar deuda' })
  update(@Param('id') id: string, @Body() dto: UpdateDebtDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/waive')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Exonerar mora (CU-09)' })
  waive(@Param('id') id: string) {
    return this.service.waive(id);
  }
}
