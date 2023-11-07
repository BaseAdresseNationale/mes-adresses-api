export type EmailStrategy = {
  pinCode: string;
  type: 'email';
  pinCodeExpiration: Date;
  remainingAttempts: number;
  createdAt: Date;
};

export type FranceConnectStrategy = {
  type: 'franceconnect';
};

export enum StatusHabiliation {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export type Habilitation = {
  _id: string;
  codeCommune: string;
  emailCommune: string;
  franceconnectAuthenticationUrl: string;
  strategy: EmailStrategy | FranceConnectStrategy;
  client: string;
  status: StatusHabiliation;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
};
