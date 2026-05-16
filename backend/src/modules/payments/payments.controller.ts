import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
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
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN, Role.RESIDENT)
  @ApiOperation({ summary: 'Registrar pago (CU-08)' })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Aprobar pago pendiente' })
  approvePayment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approvePayment(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Rechazar pago pendiente' })
  rejectPayment(@Param('id') id: string, @Body() dto: RejectPaymentDto, @CurrentUser() user: any) {
    return this.service.rejectPayment(id, user.id, dto.reason);
  }

  @Patch(':id/void')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Anular pago' })
  voidPayment(@Param('id') id: string, @Body() dto: VoidPaymentDto, @CurrentUser() user: any) {
    return this.service.voidPayment(id, user.id, dto.reason);
  }

  @Get('resident/:unitId')
  @Roles(Role.ADMIN, Role.ACCOUNTANT, Role.RESIDENT, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Historial de pagos por unidad' })
  findByResident(@Param('unitId') unitId: string, @CurrentUser() user: any) {
    return this.service.findByResident(unitId, user);
  }
}
