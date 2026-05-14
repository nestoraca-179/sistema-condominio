import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

@Entity('notifications_log')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  notice_id: string;

  @ManyToOne('Notice', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id' })
  notice: any;

  @Column({ length: 100 })
  recipient_email: string;

  @CreateDateColumn()
  sent_at: Date;

  @Column({ length: 50, nullable: true })
  status: string;
}
