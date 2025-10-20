export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  name?: string | null;
}

export interface RegisterResponse {
  user?: AuthUser;
  message?: string;
  [key: string]: unknown;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface GoogleLoginPayload {
  idToken: string;
}

export interface ResetPasswordRequestPayload {
  email: string;
}

export interface ResetPasswordRequestResponse {
  resetToken?: string;
  reset_token?: string;
  expiresAt?: string;
  expires_at?: string;
  message?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

export interface ResetPasswordConfirmPayload {
  token: string;
  password: string;
}

export interface ResetPasswordConfirmResponse {
  message?: string;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  user?: AuthUser;
  tokens?: AuthTokens;
  token?: string;
  message?: string;
  [key: string]: unknown;
}
