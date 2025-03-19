import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Point,
  PrimaryColumn,
} from 'typeorm';
import { Numero } from './numero.entity';
import { Toponyme } from './toponyme.entity';
import { ObjectId } from 'mongodb';
import { Validate } from 'class-validator';
import { PointValidator } from '../validators/coord.validator';
import { ValidatorBal } from '../validators/validator_bal.validator';

export enum PositionTypeEnum {
  ENTREE = 'entrée',
  BATIMENT = 'bâtiment',
  CAGE_ESCALIER = 'cage d’escalier',
  LOGEMENT = 'logement',
  SERVICE_TECHNIQUE = 'service technique',
  DELIVRANCE_POSTALE = 'délivrance postale',
  PARCELLE = 'parcelle',
  SEGMENT = 'segment',
}

@Entity({ name: 'positions' })
export class Position {
  @ApiProperty()
  @PrimaryColumn('varchar', { length: 24 })
  id?: string;

  @BeforeInsert()
  generatedObjectId? = function () {
    this.id = new ObjectId().toHexString();
  };

  @Index('IDX_positions_toponyme_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'toponyme_id', nullable: true })
  toponymeId?: string;

  @Index('IDX_positions_numeros_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'numero_id', nullable: true })
  numeroId?: string;

  @ApiProperty({ enum: PositionTypeEnum })
  @Validate(ValidatorBal, ['position'])
  @Column('enum', {
    enum: PositionTypeEnum,
    default: PositionTypeEnum.ENTREE,
    nullable: false,
  })
  type: PositionTypeEnum;

  @ApiProperty()
  @Column('text', { nullable: true })
  source?: string;

  @Column('bool', { name: 'is_default', nullable: false, default: false })
  isDefault?: boolean;

  @ApiProperty()
  @Column('int', { nullable: false })
  rank?: number;

  @Index('IDX_positions_point', { spatial: true })
  @ApiProperty()
  @Validate(PointValidator)
  @Column('geometry', {
    nullable: false,
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  point: Point;

  @ApiProperty({ type: () => Toponyme })
  @ManyToOne(() => Toponyme, (toponyme) => toponyme.positions, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'toponyme_id' })
  toponyme?: Toponyme;

  @ApiProperty({ type: () => Numero })
  @ManyToOne(() => Numero, (numero) => numero.positions, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'numero_id' })
  numero?: Numero;
}
