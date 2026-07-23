import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export class GlobalEntity {
  @ApiProperty()
  @PrimaryColumn('varchar', { length: 24 })
  id: string;

  @ApiProperty()
  @Column('uuid', { name: 'ban_id', nullable: false })
  banId: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  generatedObjectId?() {
    this.id = new ObjectId().toHexString();
  }
}
