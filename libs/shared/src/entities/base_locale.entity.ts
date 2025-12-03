import { GlobalEntity } from './global.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AfterLoad, Column, Entity, OneToMany } from 'typeorm';
import { Voie } from './voie.entity';
import { Numero } from './numero.entity';
import { Toponyme } from './toponyme.entity';
import { getCommune } from '../utils/cog.utils';

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

export class BaseLocaleFondDeCarte {
  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;
}

export class BaseLocaleSetting {
  @ApiProperty()
  languageGoalIgnored: boolean;

  @ApiProperty()
  toponymeGoalIgnored: boolean;

  @ApiProperty({ type: () => BaseLocaleFondDeCarte, isArray: true })
  fondsDeCartes: BaseLocaleFondDeCarte[];
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

  @ApiProperty({ required: false, type: String })
  communeNom?: string;

  @ApiProperty()
  @Column('json', { name: 'commune_noms_alt', nullable: true })
  communeNomsAlt: Record<string, string> | null;

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

  @ApiProperty({ type: () => BaseLocaleSetting })
  @Column('jsonb', { nullable: true })
  settings: BaseLocaleSetting | null;

  @ApiProperty({ type: () => Voie, isArray: true })
  @OneToMany(() => Voie, (voie) => voie.baseLocale)
  voies?: Voie[];

  @ApiProperty({ type: () => Toponyme, isArray: true })
  @OneToMany(() => Toponyme, (toponyme) => toponyme.baseLocale)
  toponymes?: Toponyme[];

  @ApiProperty({ type: () => Numero, isArray: true })
  @OneToMany(() => Numero, (numero) => numero.baseLocale)
  numeros?: Numero[];

  @AfterLoad()
  getCommuneNom?(): void {
    this.communeNom = getCommune(this.commune)?.nom;
  }
}
