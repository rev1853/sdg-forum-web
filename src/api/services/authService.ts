import type { ApiClient } from '../client';
import type {
  GoogleLoginPayload,
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  ResetPasswordConfirmPayload,
  ResetPasswordConfirmResponse,
  ResetPasswordRequestPayload,
  ResetPasswordRequestResponse,
} from '../models';

export interface AuthService {
  register(payload: RegisterPayload): Promise<RegisterResponse | void>;
  login(payload: LoginPayload): Promise<LoginResponse | void>;
  loginWithGoogle(payload: GoogleLoginPayload): Promise<LoginResponse | void>;
  requestPasswordReset(
    payload: ResetPasswordRequestPayload,
  ): Promise<ResetPasswordRequestResponse | void>;
  confirmPasswordReset(
    payload: ResetPasswordConfirmPayload,
  ): Promise<ResetPasswordConfirmResponse | void>;
}

export const createAuthService = (client: ApiClient): AuthService => ({
  register: (payload) =>
    client.request<RegisterResponse | void>({
      path: '/auth/register',
      method: 'POST',
      body: payload,
    }),
  login: (payload) =>
    client.request<LoginResponse | void>({
      path: '/auth/login',
      method: 'POST',
      body: payload,
    }),
  loginWithGoogle: (payload) =>
    client.request<LoginResponse | void>({
      path: '/auth/google',
      method: 'POST',
      body: payload,
    }),
  requestPasswordReset: (payload) =>
    client.request<ResetPasswordRequestResponse | void>({
      path: '/auth/reset-password/request',
      method: 'POST',
      body: payload,
    }),
  confirmPasswordReset: (payload) =>
    client.request<ResetPasswordConfirmResponse | void>({
      path: '/auth/reset-password/confirm',
      method: 'POST',
      body: payload,
    }),
});
