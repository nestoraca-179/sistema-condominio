import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

export enum FeeType { ORDINARY = 'ordinary', EXTRAORDINARY = 'extraordinary' }
export enum Currency { VES = 'VES', USD = 'USD' }

@Entity('fees')
export class Fee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  condominium_id: string;

  @ManyToOne('Condominium', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'condominium_id' })
  condominium: any;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'enum', enum: FeeType })
  type: FeeType;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount_ves: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount_original: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  exchange_rate: number;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
