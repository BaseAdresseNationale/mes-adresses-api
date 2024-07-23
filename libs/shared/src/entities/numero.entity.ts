import { ApiProperty } from '@nestjs/swagger';
import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { GlobalEntity } from './global.entity';
import { BaseLocale } from './base_locale.entity';
import { Voie } from './voie.entity';
import { Toponyme } from './toponyme.entity';
import { Position } from './position.entity';

export function displaySuffix(numero: Numero): string {
  if (numero.suffixe) {
    if (numero.suffixe.trim().match(/^\d/)) {
      return '-' + numero.suffixe.trim();
    }
    return numero.suffixe.trim();
  }
  return '';
}

@Entity({ name: 'numeros' })
export class Numero extends GlobalEntity {
  @ApiProperty()
  @Column('varchar', { length: 32, name: 'bal_id', nullable: false })
  balId: string;

  @ApiProperty()
  @Column('varchar', { length: 32, name: 'voie_id', nullable: false })
  voieId: string;

  @ApiProperty()
  @Column('varchar', { length: 32, name: 'toponyme_id', nullable: true })
  toponymeId: string;

  @ApiProperty()
  @Column('int', { nullable: false })
  numero: number;

  @ApiProperty()
  @Column('text', { nullable: true })
  suffixe?: string | null;

  @ApiProperty()
  numeroComplet: string;

  @ApiProperty()
  @Column('text', { nullable: true })
  comment?: string | null;

  @ApiProperty()
  @Column('text', { nullable: true, array: true })
  parcelles?: string[] | null;

  @ApiProperty()
  @Column('boolean', { nullable: false, default: false })
  certifie?: boolean;

  @ApiProperty({ type: () => Position, isArray: true })
  @OneToMany(() => Position, (position) => position.numero, {
    eager: true,
    cascade: true,
  })
  positions?: Position[];

  @AfterLoad()
  sortPositions?() {
    if (this?.positions?.length) {
      this.positions.sort(
        (a, b) => a.createdAt?.getTime() - b.createdAt?.getTime(),
      );
    }
  }

  @ApiProperty({ type: () => BaseLocale })
  @ManyToOne(() => BaseLocale, (baseLocale) => baseLocale.numeros)
  @JoinColumn({ name: 'bal_id' })
  baseLocale?: BaseLocale;

  @ApiProperty({ type: () => Voie })
  @ManyToOne(() => Voie, (voie) => voie.numeros, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'voie_id' })
  voie?: Voie;

  @ApiProperty({ type: () => Toponyme })
  @ManyToOne(() => Toponyme, (toponyme) => toponyme.numeros)
  @JoinColumn({ name: 'toponyme_id' })
  toponyme?: Toponyme;

  @AfterLoad()
  getNumeroComplet() {
    this.numeroComplet = this.numero + displaySuffix(this);
  }
}
