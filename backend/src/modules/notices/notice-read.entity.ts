import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('notice_reads')
@Unique(['notice_id', 'user_id'])
export class NoticeRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  notice_id: string;

  @ManyToOne('Notice', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id' })
  notice: any;

  @Column()
  user_id: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: any;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}