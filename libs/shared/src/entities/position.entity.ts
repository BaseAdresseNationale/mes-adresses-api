import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Point,
  PrimaryColumn,
} from 'typeorm';
import { BaseLocale } from './base_locale.entity';
import { Numero } from './numero.entity';
import { Toponyme } from './toponyme.entity';
import { ObjectId } from 'mongodb';

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
  @PrimaryColumn('varchar', { length: 32 })
  id?: string;

  @BeforeInsert()
  generatedObjectId? = function () {
    this.id = new ObjectId().toHexString();
  };

  @ApiProperty()
  @Column('varchar', { length: 32, name: 'bal_id', nullable: false })
  balId: string;

  @ApiProperty()
  @Column('varchar', { length: 32, name: 'toponyme_id', nullable: true })
  toponymeId: string;

  @ApiProperty()
  @Column('varchar', { length: 32, name: 'numero_id', nullable: true })
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
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @Column('geometry', {
    nullable: false,
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  point: Point;

  @ApiProperty({ type: () => Toponyme })
  @ManyToOne(() => Toponyme, (toponyme) => toponyme.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'toponyme_id' })
  toponyme?: Toponyme;

  @ApiProperty({ type: () => Numero })
  @ManyToOne(() => Numero, (numero) => numero.positions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'numero_id' })
  numero?: Numero;

  @ApiProperty({ type: () => BaseLocale })
  @ManyToOne(() => BaseLocale, (baseLocale) => baseLocale.positions)
  @JoinColumn({ name: 'bal_id' })
  baseLocale?: BaseLocale;
}
