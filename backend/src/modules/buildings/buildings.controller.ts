import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';

@ApiTags('Buildings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly service: BuildingsService) {}

  @Get('sectors')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Obtener estructura física (CU-05)' })
  @ApiQuery({ name: 'condominiumId', required: true })
  getSectors(@Query('condominiumId') condominiumId: string) {
    return this.service.getSectors(condominiumId);
  }

  @Post('sectors')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Crear sector/edificio/torre' })
  createBuilding(@Body() dto: CreateBuildingDto) {
    return this.service.createBuilding(dto);
  }

  @Patch('sectors/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateBuilding(@Param('id') id: string, @Body() dto: Partial<CreateBuildingDto>) {
    return this.service.updateBuilding(id, dto);
  }

  @Get('units')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT)
  @ApiOperation({ summary: 'Listar unidades' })
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiQuery({ name: 'buildingId', required: false })
  getUnits(
    @Query('condominiumId') condominiumId?: string,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.service.getUnits(condominiumId, buildingId);
  }

  @Get('units/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.ACCOUNTANT, Role.RESIDENT)
  findUnit(@Param('id') id: string) {
    return this.service.findUnit(id);
  }

  @Post('units')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Registrar unidad habitacional (CU-06)' })
  createUnit(@Body() dto: CreateUnitDto) {
    return this.service.createUnit(dto);
  }

  @Patch('units/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateUnit(@Param('id') id: string, @Body() dto: Partial<CreateUnitDto>) {
    return this.service.updateUnit(id, dto);
  }
}
