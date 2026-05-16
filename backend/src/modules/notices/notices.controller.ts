import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notices')
export class NoticesController {
  constructor(private readonly service: NoticesService) {}

  @Get()
  @ApiOperation({ summary: 'Ver comunicados (CU-16)' })
  @ApiQuery({ name: 'condominiumId', required: true })
  findAll(
    @Query('condominiumId') condominiumId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findAll(condominiumId, user);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Contar comunicados no leídos del usuario actual' })
  @ApiQuery({ name: 'condominiumId', required: true })
  getUnreadCount(
    @Query('condominiumId') condominiumId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.getUnreadCount(condominiumId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar comunicado como leído' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.markAsRead(id, user);
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @ApiOperation({ summary: 'Emitir comunicado (CU-10, CU-18)' })
  create(
    @Body() dto: CreateNoticeDto,
    @CurrentUser() user: any,
    @Query('recipients') recipients?: string,
  ) {
    const recipientList = recipients ? recipients.split(',') : [];
    return this.service.create(dto, user.id, recipientList);
  }
}
