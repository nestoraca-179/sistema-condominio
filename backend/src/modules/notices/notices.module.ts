import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { Notice } from './notice.entity';
import { NotificationLog } from './notification-log.entity';
import { NoticeRead } from './notice-read.entity';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notice, NotificationLog, NoticeRead, Unit, Building])],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}
