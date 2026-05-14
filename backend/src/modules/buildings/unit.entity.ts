import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';

@Entity('units')
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  building_id: string;

  @ManyToOne('Building', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'building_id' })
  building: any;

  @Column({ length: 20 })
  unit_number: string;

  @Column({ length: 10, nullable: true })
  floor: string;

  @Column({ nullable: true })
  owner_id: string;

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: any;

  @Column({ default: true })
  is_occupied: boolean;

  @CreateDateColumn()
  created_at: Date;
}
