import {
  EmailStrategy,
  FranceConnectStrategy,
  Habilitation,
  StatusHabiliation,
} from '@/shared/modules/api_depot/types/habilitation.type';
import { ApiProperty } from '@nestjs/swagger';

export class Strategy {
  @ApiProperty({ enum: ['email', 'franceconnect'] })
  type: 'email' | 'franceconnect';

  @ApiProperty()
  pinCode: string;

  @ApiProperty()
  pinCodeExpiration: Date;

  @ApiProperty()
  remainingAttempts: number;

  @ApiProperty()
  createdAt: Date;
}

export class HabilitationDTO implements Habilitation {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  codeCommune: string;

  @ApiProperty()
  emailCommune: string;

  @ApiProperty()
  franceconnectAuthenticationUrl?: string;

  @ApiProperty({ type: () => Strategy })
  strategy?: EmailStrategy | FranceConnectStrategy;

  @ApiProperty()
  client?: string;

  @ApiProperty({ enum: StatusHabiliation })
  status: StatusHabiliation;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;

  @ApiProperty()
  expiresAt?: Date;
}
