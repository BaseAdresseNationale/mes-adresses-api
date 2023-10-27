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

export type Habilitation = {
  _id: string;
  codeCommune: string;
  emailCommune: string;
  franceconnectAuthenticationUrl: string;
  strategy: EmailStrategy | FranceConnectStrategy;
  client: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
};
