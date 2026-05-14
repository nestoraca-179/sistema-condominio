import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Notice, NoticeTargetType } from './notice.entity';
import { NotificationLog } from './notification-log.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';

@Injectable()
export class NoticesService {
  private readonly logger = new Logger(NoticesService.name);

  constructor(
    @InjectRepository(Notice) private noticeRepo: Repository<Notice>,
    @InjectRepository(NotificationLog) private logRepo: Repository<NotificationLog>,
  ) {}

  async findAll(condominiumId: string) {
    return this.noticeRepo.find({
      where: { condominium_id: condominiumId },
      relations: ['sentByUser'],
      order: { created_at: 'DESC' },
    });
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
