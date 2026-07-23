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
  COMPOSITE = 'composite',
}

export enum EventActionEnum {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  MERGE_VOIES = 'MERGE_VOIES',
  CONVERT_VOIE_TO_TOPONYME = 'CONVERT_VOIE_TO_TOPONYME',
}

const payloadSchema = {
  oneOf: EVENT_PAYLOAD_MODELS.map((model) => ({ $ref: getSchemaPath(model) })),
};

@Entity({ name: 'events' })
@Index('IDX_events_unsynced_entity', ['entityType', 'entityId'], {
  unique: true,
  where: '"is_synced" = false AND "entity_id" IS NOT NULL',
})
@Index('IDX_events_bal_id_is_synced', ['balId', 'isSynced'])
@ApiExtraModels(...EVENT_PAYLOAD_MODELS)
export class Event {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column('varchar', { length: 24, name: 'bal_id' })
  balId: string;

  @ApiProperty()
  @Index('IDX_events_parent_event_id')
  @Column('uuid', { name: 'parent_event_id', nullable: true })
  parentEventId: string | null;

  @ManyToOne(() => Event, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_event_id' })
  parentEvent?: Event;

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

  @ApiProperty()
  @Column('boolean', { name: 'is_synced', default: false })
  isSynced: boolean;

  @ApiProperty()
  @Column('timestamptz', { name: 'synced_at', nullable: true })
  syncedAt: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
