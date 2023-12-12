import {
  EmailStrategy,
  FranceConnectStrategy,
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { ApiProperty } from '@nestjs/swagger';

export class HabilitationDTO implements Habilitation {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  codeCommune: string;

  @ApiProperty()
  emailCommune: string;

  @ApiProperty()
  franceconnectAuthenticationUrl?: string;

  @ApiProperty()
  strategy?: EmailStrategy | FranceConnectStrategy;

  @ApiProperty()
  client?: string;

  @ApiProperty()
  status: StatusHabiliation;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;

  @ApiProperty()
  expiresAt?: Date;
}
