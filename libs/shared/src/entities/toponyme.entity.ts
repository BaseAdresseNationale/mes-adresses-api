import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { GlobalEntity } from './global.entity';
import { BaseLocale } from './base_locale.entity';
import { Numero } from './numero.entity';
import { Position } from './position.entity';

@Entity({ name: 'toponymes' })
export class Toponyme extends GlobalEntity {
  @ApiProperty()
  @Column('varchar', { name: 'bal_id', nullable: false, length: 24 })
  balId: string;

  @ApiProperty()
  @Column('text', { nullable: false })
  nom: string;

  @ApiProperty()
  @Column('json', { name: 'nom_alt', nullable: true })
  nomAlt: Record<string, string> | null;

  @ApiProperty()
  @Column('simple-array', { nullable: true, array: true })
  parcelles?: string[] | null;

  @OneToMany(() => Position, (position) => position.toponyme, {
    eager: true,
    cascade: true,
  })
  positions: Position[];

  @ManyToOne(() => BaseLocale, (baseLocale) => baseLocale.toponymes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bal_id' })
  baseLocale: BaseLocale;

  @OneToMany(() => Numero, (numero) => numero.toponyme)
  numeros: Numero[];
}
