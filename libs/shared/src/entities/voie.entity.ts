import { ApiProperty } from '@nestjs/swagger';
import { GlobalEntity } from './global.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  LineString,
  ManyToOne,
  OneToMany,
  Point,
} from 'typeorm';
import { BaseLocale } from './base_locale.entity';
import { Numero } from './numero.entity';

export enum TypeNumerotationEnum {
  NUMERIQUE = 'numerique',
  METRIQUE = 'metrique',
}

@Entity({ name: 'voies' })
export class Voie extends GlobalEntity {
  @Index('IDX_voies_bal_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'bal_id', nullable: false })
  balId: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  nom: string;

  @ApiProperty()
  @Column('json', { name: 'nom_alt', nullable: true })
  nomAlt: Record<string, string> | null;

  @ApiProperty({ enum: TypeNumerotationEnum })
  @Column('enum', {
    name: 'type_numerotation',
    enum: TypeNumerotationEnum,
    default: TypeNumerotationEnum.NUMERIQUE,
  })
  typeNumerotation: TypeNumerotationEnum;

  @ApiProperty()
  @Column('geometry', {
    nullable: true,
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  centroid: Point | null;

  @ApiProperty()
  @Column('geometry', {
    nullable: true,
    spatialFeatureType: 'LineString',
    srid: 4326,
  })
  trace: LineString | null;

  @ApiProperty({ type: Number, isArray: true })
  @Column('float', { nullable: true, array: true })
  bbox: number[] | null;

  @ApiProperty()
  @Column('text', { nullable: true })
  comment?: string | null;

  @ApiProperty({ type: () => BaseLocale })
  @ManyToOne(() => BaseLocale, (baseLocale) => baseLocale.voies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bal_id' })
  baseLocale?: BaseLocale;

  @ApiProperty({ type: () => Numero, isArray: true })
  @OneToMany(() => Numero, (numero) => numero.voie)
  numeros?: Numero[];
}
