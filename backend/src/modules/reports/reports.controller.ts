import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('financial')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Reporte financiero por período (CU-11)' })
  @ApiQuery({ name: 'condominiumId', required: true })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-12-31' })
  getFinancialReport(
    @Query('condominiumId') condominiumId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getFinancialReport(condominiumId, startDate, endDate);
  }

  @Get('global-statement')
  @Roles(Role.ACCOUNTANT, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Estado de cuenta global (CU-14)' })
  @ApiQuery({ name: 'condominiumId', required: true })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  getGlobalStatement(
    @Query('condominiumId') condominiumId: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.service.getGlobalStatement(condominiumId, year ? +year : undefined, month ? +month : undefined);
  }
}
