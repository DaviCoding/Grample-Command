export type AuthenticatedUser = {
  username: string;
};

export type SessionPayload = {
  username: string;
  csrfToken: string;
  issuedAt: number;
  expiresAt: number;
};
