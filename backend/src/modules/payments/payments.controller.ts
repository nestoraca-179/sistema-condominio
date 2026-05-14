import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Listar todos los pagos' })
  @ApiQuery({ name: 'condominiumId', required: false })
  findAll(@Query('condominiumId') condominiumId?: string) {
    return this.service.findAll(condominiumId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Registrar pago (CU-08)' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Get('resident/:unitId')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.RESIDENT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Historial de pagos por unidad' })
  findByResident(@Param('unitId') unitId: string) {
    return this.service.findByResident(unitId);
  }
}
