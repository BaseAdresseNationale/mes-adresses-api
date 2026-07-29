import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EVENT_PAYLOAD_MODELS, EventPayload } from './event_payload.type';

export enum EventEntityTypeEnum {
  VOIE = 'voie',
  TOPONYME = 'toponyme',
  NUMERO = 'numero',
  POSITION = 'position',
}

export enum EventActionEnum {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

const payloadSchema = {
  oneOf: EVENT_PAYLOAD_MODELS.map((model) => ({ $ref: getSchemaPath(model) })),
};

@Entity({ name: 'events' })
@Index('IDX_events_unsynced_entity', ['entityType', 'entityId'], {
  unique: true,
  where: '"is_synced_with_revision" IS NULL AND "entity_id" IS NOT NULL',
})
@Index(
  'IDX_events_bal_id_is_synced_with_revision',
  ['balId', 'isSyncedWithRevision'],
  { where: '"parent_event_id" IS NULL' },
)
@ApiExtraModels(...EVENT_PAYLOAD_MODELS)
export class Event {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column('varchar', { length: 24, name: 'bal_id' })
  balId: string;

  @ApiProperty()
  @Index('IDX_events_voie_id')
  @Column('varchar', { length: 24, name: 'voie_id', nullable: true })
  voieId: string | null;

  @ApiProperty()
  @Index('IDX_events_parent_event_id')
  @Column('uuid', { name: 'parent_event_id', nullable: true })
  parentEventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_event_id' })
  parentEvent?: Event;

  @ApiProperty({ type: () => Event, nullable: true, isArray: true })
  @OneToMany(() => Event, (event) => event.parentEvent)
  childEvents?: Event[];

  @ApiProperty({ enum: EventEntityTypeEnum })
  @Column('enum', { enum: EventEntityTypeEnum, name: 'entity_type' })
  entityType: EventEntityTypeEnum;

  @ApiProperty()
  @Column('varchar', { length: 24, name: 'entity_id', nullable: true })
  entityId: string | null;

  @ApiProperty({ enum: EventActionEnum })
  @Column('enum', { enum: EventActionEnum })
  action: EventActionEnum;

  @ApiProperty({ ...payloadSchema, nullable: true })
  @Column('jsonb', { name: 'payload_before', nullable: true })
  payloadBefore: EventPayload | null;

  @ApiProperty({ ...payloadSchema, nullable: true })
  @Column('jsonb', { name: 'payload_after', nullable: true })
  payloadAfter: EventPayload | null;

  // null = event en attente de publication ; sinon l'id de la révision
  // api-depot avec laquelle cet event a été publié.
  @ApiProperty({ nullable: true })
  @Column('varchar', {
    length: 24,
    name: 'is_synced_with_revision',
    nullable: true,
  })
  isSyncedWithRevision: string | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
