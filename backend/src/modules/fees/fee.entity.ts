import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Building } from '../buildings/building.entity';
import { Unit } from '../buildings/unit.entity';

export enum FeeType { ORDINARY = 'ordinary', EXTRAORDINARY = 'extraordinary' }
export enum Currency { VES = 'VES', USD = 'USD' }
export enum FeeApplyScope { CONDOMINIUM = 'condominium', BUILDING = 'building', UNIT = 'unit' }

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

  @Column({ type: 'date', nullable: true })
  start_date: string;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'enum', enum: FeeApplyScope, default: FeeApplyScope.CONDOMINIUM })
  applies_to: FeeApplyScope;

  @Column({ nullable: true })
  target_building_id: string;

  @ManyToOne(() => Building, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_building_id' })
  targetBuilding: Building;

  @Column({ nullable: true })
  target_unit_id: string;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_unit_id' })
  targetUnit: Unit;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
