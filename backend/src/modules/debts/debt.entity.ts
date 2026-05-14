import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, UpdateDateColumn,
} from 'typeorm';

export enum DebtStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  WAIVED = 'waived',
}

@Entity('debts')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  unit_id: string;

  @ManyToOne('Unit', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unit_id' })
  unit: any;

  @Column()
  fee_id: string;

  @ManyToOne('Fee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fee_id' })
  fee: any;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  original_amount_ves: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  late_fee_ves: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paid_amount_ves: number;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.PENDING })
  status: DebtStatus;

  @Column({ type: 'date' })
  due_date: string;

  @UpdateDateColumn()
  updated_at: Date;
}
