export enum StatusHabilitationEnum {
  ACCEPTED = 'accepted',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum TypeStrategyEnum {
  EMAIL = 'email',
  FRANCECONNECT = 'franceconnect',
  INTERNAL = 'internal',
}

export type Mandat = {
  nomMarital: string;
  nomNaissance: string;
  prenom: string;
};

export type Strategy = {
  type: TypeStrategyEnum;
  // EMAIL
  pinCode?: string;
  pinCodeExpiration?: Date | null;
  createdAt?: Date | null;
  remainingAttempts?: number;
  // FRANCECONNECT
  mandat?: Mandat;
  authenticationError?: string;
};

export type Habilitation = {
  id?: string;
  clientId?: string;
  codeCommune: string;
  emailCommune: string;
  franceconnectAuthenticationUrl?: string;
  status: StatusHabilitationEnum;
  strategy?: Strategy | null;
  expiresAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
