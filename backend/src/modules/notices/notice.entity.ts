import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

export enum NoticeTargetType {
  ALL = 'all',
  SECTOR = 'sector',
  BUILDING = 'building',
  UNIT = 'unit',
}

@Entity('notices')
export class Notice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  condominium_id: string;

  @ManyToOne('Condominium', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'condominium_id' })
  condominium: any;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: NoticeTargetType })
  target_type: NoticeTargetType;

  @Column({ nullable: true })
  target_id: string;

  @Column({ default: false })
  sent_by_email: boolean;

  @Column({ nullable: true })
  sent_by: string;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by' })
  sentByUser: any;

  @CreateDateColumn()
  created_at: Date;
}
