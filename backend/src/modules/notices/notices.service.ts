import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Role } from '../../common/enums/roles.enum';
import { Unit } from '../buildings/unit.entity';
import { Building } from '../buildings/building.entity';
import { Notice, NoticeTargetType } from './notice.entity';
import { NotificationLog } from './notification-log.entity';
import { NoticeRead } from './notice-read.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';

@Injectable()
export class NoticesService {
  private readonly logger = new Logger(NoticesService.name);

  constructor(
    @InjectRepository(Notice) private noticeRepo: Repository<Notice>,
    @InjectRepository(NotificationLog) private logRepo: Repository<NotificationLog>,
    @InjectRepository(NoticeRead) private readRepo: Repository<NoticeRead>,
    @InjectRepository(Unit) private unitRepo: Repository<Unit>,
    @InjectRepository(Building) private buildingRepo: Repository<Building>,
  ) {}

  private async getBuildingLineageIds(buildingId: string) {
    const ids = new Set<string>();
    let currentId: string | null | undefined = buildingId;

    while (currentId) {
      ids.add(currentId);
      const building = await this.buildingRepo.findOne({ where: { id: currentId } });
      currentId = building?.parent_id;
    }

    return ids;
  }

  private async getVisibleNotices(condominiumId: string, user: { id: string; role: Role }) {
    const notices = await this.noticeRepo.find({
      where: { condominium_id: condominiumId },
      relations: ['sentByUser'],
      order: { created_at: 'DESC' },
    });

    if (user.role === Role.ADMIN || user.role === Role.SUPERADMIN) {
      return notices;
    }

    const residentUnits = await this.unitRepo.find({
      where: { owner_id: user.id },
      relations: ['building'],
    });

    if (residentUnits.length === 0) {
      return notices.filter(notice => notice.target_type === NoticeTargetType.ALL);
    }

    const unitIds = new Set(residentUnits.map(unit => unit.id));
    const buildingIds = new Set<string>();

    for (const unit of residentUnits) {
      const lineage = await this.getBuildingLineageIds(unit.building_id);
      lineage.forEach(id => buildingIds.add(id));
    }

    return notices.filter(notice => {
      if (notice.target_type === NoticeTargetType.ALL) return true;
      if (notice.target_type === NoticeTargetType.UNIT) {
        return !!notice.target_id && unitIds.has(notice.target_id);
      }
      if (notice.target_type === NoticeTargetType.SECTOR || notice.target_type === NoticeTargetType.BUILDING) {
        return !!notice.target_id && buildingIds.has(notice.target_id);
      }
      return false;
    });
  }

  async findAll(condominiumId: string, user: { id: string; role: Role }) {
    const notices = await this.getVisibleNotices(condominiumId, user);

    if (user.role === Role.ADMIN || user.role === Role.SUPERADMIN) {
      return notices;
    }

    const reads = await this.readRepo.find({
      where: { user_id: user.id },
    });
    const readNoticeIds = new Set(
      reads.filter(read => !!read.read_at).map(read => read.notice_id),
    );

    return notices.map(notice => ({
      ...notice,
      is_read: readNoticeIds.has(notice.id),
    }));
  }

  async getUnreadCount(condominiumId: string, user: { id: string; role: Role }) {
    if (user.role !== Role.RESIDENT) {
      return { count: 0 };
    }

    const notices = await this.getVisibleNotices(condominiumId, user);
    const reads = await this.readRepo.find({
      where: { user_id: user.id },
    });
    const readNoticeIds = new Set(
      reads.filter(read => !!read.read_at).map(read => read.notice_id),
    );

    return {
      count: notices.filter(notice => !readNoticeIds.has(notice.id)).length,
    };
  }

  async markAsRead(id: string, user: { id: string; role: Role; condominium_id?: string }) {
    if (user.role !== Role.RESIDENT) {
      return { success: true };
    }

    const notices = await this.getVisibleNotices(user.condominium_id || '', user);
    const visibleNotice = notices.find(notice => notice.id === id);
    if (!visibleNotice) {
      throw new ForbiddenException('No tiene acceso a este comunicado');
    }

    const notice = await this.noticeRepo.findOne({ where: { id } });
    if (!notice) throw new NotFoundException('Comunicado no encontrado');

    let read = await this.readRepo.findOne({
      where: { notice_id: id, user_id: user.id },
    });

    if (!read) {
      read = this.readRepo.create({
        notice_id: id,
        user_id: user.id,
        read_at: new Date(),
      });
    } else if (!read.read_at) {
      read.read_at = new Date();
    }

    await this.readRepo.save(read);
    return { success: true };
  }

  async findOne(id: string) {
    return this.noticeRepo.findOne({ where: { id }, relations: ['sentByUser'] });
  }

  async create(dto: CreateNoticeDto, userId: string, recipients?: string[]) {
    const notice = this.noticeRepo.create({
      condominium_id: dto.condominium_id,
      title: dto.title,
      content: dto.content,
      target_type: dto.target_type,
      target_id: dto.target_id,
      sent_by: userId,
      sent_by_email: dto.send_by_email || false,
    });
    const saved = await this.noticeRepo.save(notice);

    if (dto.send_by_email && recipients && recipients.length > 0) {
      await this.sendEmailNotifications(saved.id, saved.title, saved.content, recipients);
    }
    return saved;
  }

  private async sendEmailNotifications(
    noticeId: string,
    subject: string,
    content: string,
    recipients: string[],
  ) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('SMTP no configurado — omitiendo envío de correos');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    for (const email of recipients) {
      let status = 'sent';
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@sistemacondominio.com',
          to: email,
          subject: `[Condominio] ${subject}`,
          text: content,
          html: `<div style="font-family:sans-serif;"><h2>${subject}</h2><p>${content}</p></div>`,
        });
      } catch (err) {
        this.logger.error(`Error enviando correo a ${email}: ${err.message}`);
        status = 'failed';
      }
      const log = this.logRepo.create({ notice_id: noticeId, recipient_email: email, status });
      await this.logRepo.save(log);
    }
  }
}
