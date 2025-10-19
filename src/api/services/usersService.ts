import type { ApiClient } from '../client';
import type {
  ThreadListQuery,
  ThreadListResponse,
  UserResponse,
  UserThreadsResponse,
  UserUpdatePayload,
} from '../models';

const serializeUserUpdate = (payload: UserUpdatePayload): FormData => {
  const formData = new FormData();

  if (payload.email !== undefined && payload.email !== null) {
    formData.set('email', payload.email);
  }

  if (payload.username !== undefined && payload.username !== null) {
    formData.set('username', payload.username);
  }

  if (payload.name !== undefined && payload.name !== null) {
    formData.set('name', payload.name);
  }

  if (payload.removeProfilePicture) {
    formData.set('removeProfilePicture', String(payload.removeProfilePicture));
  }

  if (payload.profilePicture instanceof File) {
    formData.set('profilePicture', payload.profilePicture);
  } else if (payload.profilePicture instanceof Blob) {
    formData.set('profilePicture', payload.profilePicture, 'upload');
  }

  return formData;
};

export interface UsersService {
  getUser(userId: string): Promise<UserResponse | void>;
  updateUser(userId: string, payload: UserUpdatePayload): Promise<UserResponse | void>;
  listThreads(userId: string, query?: ThreadListQuery): Promise<UserThreadsResponse | void>;
  listReposts(userId: string, query?: ThreadListQuery): Promise<ThreadListResponse | void>;
}

export const createUsersService = (client: ApiClient): UsersService => ({
  getUser: (userId) =>
    client.request<UserResponse | void>({
      path: `/users/${encodeURIComponent(userId)}`,
      method: 'GET',
    }),
  updateUser: (userId, payload) =>
    client.request<UserResponse | void>({
      path: `/users/${encodeURIComponent(userId)}`,
      method: 'PATCH',
      body: serializeUserUpdate(payload),
      requiresAuth: true,
    }),
  listThreads: (userId, query) =>
    client.request<UserThreadsResponse | void>({
      path: `/users/${encodeURIComponent(userId)}/threads`,
      method: 'GET',
      query,
    }),
  listReposts: (userId, query) =>
    client.request<ThreadListResponse | void>({
      path: `/users/${encodeURIComponent(userId)}/reposts`,
      method: 'GET',
      query,
    }),
});
