import { GlobalEntity } from './global.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { Voie } from './voie.entity';
import { Numero } from './numero.entity';
import { Toponyme } from './toponyme.entity';
import { Position } from './position.entity';

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
  @ApiProperty()
  id: string;

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
  @Column('text', { nullable: false })
  commune: string;

  @ApiProperty()
  @Column('simple-array', { nullable: false, array: true })
  emails: string[];

  @ApiProperty()
  @Column('text', { nullable: false })
  token: string;

  @ApiProperty({ enum: StatusBaseLocalEnum })
  @Column('enum', { enum: StatusBaseLocalEnum, nullable: false })
  status: StatusBaseLocalEnum;

  @ApiProperty()
  @Column('text', { nullable: true })
  habilitation: string | null;

  @ApiProperty({ type: () => BaseLocaleSync })
  @Column('jsonb', { nullable: true })
  sync: BaseLocaleSync | null;

  @OneToMany(() => Voie, (voie) => voie.baseLocale)
  voies: Voie[];

  @OneToMany(() => Toponyme, (toponyme) => toponyme.baseLocale)
  toponymes: Toponyme[];

  @OneToMany(() => Numero, (numero) => numero.baseLocale)
  numeros: Numero[];

  @OneToMany(() => Position, (position) => position.baseLocale)
  positions: Position[];
}
