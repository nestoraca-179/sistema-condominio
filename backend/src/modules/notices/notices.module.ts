import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { Notice } from './notice.entity';
import { NotificationLog } from './notification-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notice, NotificationLog])],
  controllers: [NoticesController],
  providers: [NoticesService],
  exports: [NoticesService],
})
export class NoticesModule {}
