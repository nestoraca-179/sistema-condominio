import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Currency } from '../fees/fee.entity';

export enum PaymentStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
  VOIDED = 'voided',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  unit_id: string;

  @ManyToOne('Unit', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit: any;

  @Column({ nullable: true })
  fee_id: string;

  @ManyToOne('Fee', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fee_id' })
  fee: any;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount_ves: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount_usd: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount_original: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  exchange_rate: number;

  @Column({ type: 'date' })
  payment_date: string;

  @Column({ length: 100, nullable: true })
  reference: string;

  @Column({ nullable: true })
  registered_by: string;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registered_by' })
  registeredByUser: any;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.APPROVED })
  status: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @Column({ nullable: true })
  approved_by: string | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedByUser: any;

  @Column({ type: 'timestamptz', nullable: true })
  rejected_at: Date | null;

  @Column({ nullable: true })
  rejected_by: string | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by' })
  rejectedByUser: any;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ default: false })
  is_voided: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  voided_at: Date | null;

  @Column({ nullable: true })
  voided_by: string | null;

  @Column({ type: 'text', nullable: true })
  void_reason: string | null;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voided_by' })
  voidedByUser: any;
}
