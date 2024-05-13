import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Point,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseLocale } from './base_locale.entity';
import { Numero } from './numero.entity';
import { Toponyme } from './toponyme.entity';

export enum PositionTypeEnum {
  ENTREE = 'entrée',
  BATIMENT = 'bâtiment',
  CAGE_ESCALIER = 'cage d’escalier',
  LOGEMENT = 'logement',
  SERVICE_TECHNIQUE = 'service technique',
  DELIVRANCE_POSTALE = 'délivrance postale',
  PARCELLE = 'parcelle',
  SEGMENT = 'segment',
  INCONNUE = 'inconnue',
}

@Entity({ name: 'positions' })
export class Position {
  @ApiProperty()
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty()
  @Column('varchar', { name: 'bal_id', nullable: false, length: 24 })
  balId: string;

  @ApiProperty()
  @Column('varchar', { name: 'toponyme_id', nullable: true, length: 24 })
  toponymeId: string;

  @ApiProperty()
  @Column('varchar', { name: 'numero_id', nullable: true, length: 24 })
  numeroId: string;

  @ApiProperty({ enum: PositionTypeEnum })
  @Column('enum', {
    enum: PositionTypeEnum,
    default: PositionTypeEnum.ENTREE,
    nullable: false,
  })
  type: PositionTypeEnum;

  @ApiProperty()
  @Column('text', { nullable: true })
  source?: string;

  @ApiProperty()
  @Column('geometry', { nullable: false, spatialFeatureType: 'Point' })
  point: Point;

  @ManyToOne(() => Toponyme, (toponyme) => toponyme.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'toponyme_id' })
  toponyme: Toponyme;

  @ManyToOne(() => Numero, (numero) => numero.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'numero_id' })
  numero: Numero;

  @ManyToOne(() => BaseLocale, (baseLocale) => baseLocale.positions)
  @JoinColumn({ name: 'bal_id' })
  baseLocale: BaseLocale;
}
