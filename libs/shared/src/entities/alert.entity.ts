import { ApiProperty } from '@nestjs/swagger';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Numero } from './numero.entity';
import { Voie } from './voie.entity';
import { Toponyme } from './toponyme.entity';
import { BaseLocale } from './base_locale.entity';
import { ErrorLevelEnum } from '@ban-team/validateur-bal';

@Entity({ name: 'alerts' })
@Check(
  `((voie_id IS NOT NULL)::int + (toponyme_id IS NOT NULL)::int + (numero_id IS NOT NULL)::int) = 1`,
)
export class Alert {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_alerts_bal_id')
  @ApiProperty()
  @Column('varchar', { length: 24, name: 'bal_id', nullable: false })
  balId: string;

  @Index('IDX_alerts_voie_id')
  @ApiProperty()
  @Column('varchar', {
    length: 24,
    name: 'voie_id',
    nullable: true,
    default: null,
  })
  voieId: string;

  @Index('IDX_alerts_toponyme_id')
  @ApiProperty()
  @Column('varchar', {
    length: 24,
    name: 'toponyme_id',
    nullable: true,
    default: null,
  })
  toponymeId: string;

  @Index('IDX_alerts_numeros_id')
  @ApiProperty()
  @Column('varchar', {
    length: 24,
    name: 'numero_id',
    nullable: true,
    default: null,
  })
  numeroId?: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  field: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  value: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  error: string;

  @ApiProperty({ enum: ErrorLevelEnum })
  @Column('enum', { enum: ErrorLevelEnum, nullable: false })
  severity: ErrorLevelEnum;

  @ApiProperty()
  @Column('text', { nullable: false, default: false })
  isIgnored: boolean;

  @ApiProperty({ type: () => BaseLocale })
  @ManyToOne(() => BaseLocale, (baseLocale) => baseLocale.alerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bal_id' })
  baseLocale?: BaseLocale;

  @ApiProperty({ type: () => Voie })
  @ManyToOne(() => Voie, (voie) => voie.alerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voie_id' })
  voie?: Voie;

  @ApiProperty({ type: () => Toponyme })
  @ManyToOne(() => Toponyme, (toponyme) => toponyme.alerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'toponyme_id' })
  toponyme?: Toponyme;

  @ApiProperty({ type: () => Numero })
  @ManyToOne(() => Numero, (numero) => numero.alerts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'numero_id' })
  numero?: Numero;
}
