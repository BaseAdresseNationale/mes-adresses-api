import { GlobalEntity } from './global.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { Voie } from './voie.entity';
import { Numero } from './numero.entity';
import { Toponyme } from './toponyme.entity';

export enum StatusBaseLocalEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEMO = 'demo',
  REPLACED = 'replaced',
}

export enum StatusSyncEnum {
  OUTDATED = 'outdated',
  SYNCED = 'synced',
  CONFLICT = 'conflict',
}

export class BaseLocaleSync {
  @ApiProperty({ enum: StatusSyncEnum })
  status: StatusSyncEnum;

  @ApiProperty()
  isPaused?: boolean;

  @ApiProperty()
  lastUploadedRevisionId: string;

  @ApiProperty()
  currentUpdated?: Date;
}

@Entity({ name: 'bases_locales' })
export class BaseLocale extends GlobalEntity {
  @ApiProperty()
  @Column('text', { nullable: false })
  nom: string;

  @ApiProperty()
  @Column('json', { name: 'nom_alt', nullable: true })
  nomAlt: Record<string, string> | null;

  @ApiProperty()
  @Column('varchar', { nullable: false, length: 5 })
  commune: string;

  @ApiProperty()
  @Column('text', { nullable: true, array: true })
  emails: string[];

  @ApiProperty()
  @Column('varchar', { nullable: false, length: 20 })
  token: string;

  @ApiProperty({ enum: StatusBaseLocalEnum })
  @Column('enum', { enum: StatusBaseLocalEnum, nullable: false })
  status: StatusBaseLocalEnum;

  @ApiProperty()
  @Column('varchar', { name: 'habilitation_id', nullable: true, length: 24 })
  habilitationId: string | null;

  @ApiProperty({ type: () => BaseLocaleSync })
  @Column('jsonb', { nullable: true })
  sync: BaseLocaleSync | null;

  @ApiProperty({ type: () => Voie, isArray: true })
  @OneToMany(() => Voie, (voie) => voie.baseLocale)
  voies?: Voie[];

  @ApiProperty({ type: () => Toponyme, isArray: true })
  @OneToMany(() => Toponyme, (toponyme) => toponyme.baseLocale)
  toponymes?: Toponyme[];

  @ApiProperty({ type: () => Numero, isArray: true })
  @OneToMany(() => Numero, (numero) => numero.baseLocale)
  numeros?: Numero[];
}
