import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Exchange Rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Obtener tasa de cambio actual (CU-13)' })
  getLatest() {
    return this.service.getLatest();
  }

  @Get('history')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Historial de tasas de cambio' })
  getHistory() {
    return this.service.getHistory();
  }

  @Post()
  @Roles(Role.ACCOUNTANT, Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Registrar nueva tasa de cambio (CU-13)' })
  create(@Body() dto: CreateExchangeRateDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }
}
