import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('my-statement')
  @Roles(Role.RESIDENT, Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Estado de cuenta personal del residente (CU-15)' })
  @ApiQuery({ name: 'unitId', required: true })
  getMyStatement(@Query('unitId') unitId: string) {
    return this.service.getMyStatement(unitId);
  }

  @Get('admin-summary')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Resumen para panel administrador' })
  @ApiQuery({ name: 'condominiumId', required: true })
  getAdminSummary(@Query('condominiumId') condominiumId: string) {
    return this.service.getAdminSummary(condominiumId);
  }

  @Get('admin-dashboard')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Datos graficos para panel administrador' })
  @ApiQuery({ name: 'condominiumId', required: true })
  getAdminDashboard(@Query('condominiumId') condominiumId: string) {
    return this.service.getAdminDashboard(condominiumId);
  }

  @Get('accountant-dashboard')
  @Roles(Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Datos graficos para panel contador' })
  @ApiQuery({ name: 'condominiumId', required: true })
  getAccountantDashboard(@Query('condominiumId') condominiumId: string) {
    return this.service.getAccountantDashboard(condominiumId);
  }
}
