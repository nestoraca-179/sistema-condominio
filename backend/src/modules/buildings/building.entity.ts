import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';

export enum BuildingType {
  SECTOR = 'sector',
  BUILDING = 'building',
  TOWER = 'tower',
}

@Entity('buildings')
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  condominium_id: string;

  @ManyToOne('Condominium', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'condominium_id' })
  condominium: any;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: BuildingType })
  type: BuildingType;

  @Column({ nullable: true })
  parent_id: string;

  @ManyToOne(() => Building, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Building;

  @Column({ default: 0 })
  order_index: number;
}
