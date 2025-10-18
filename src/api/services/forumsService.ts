import type { ApiClient } from '../client';
import type {
  ForumCreatePayload,
  ForumDetail,
  ForumListQuery,
  ForumListResponse,
  ModeratorUpdatePayload,
} from '../models';

export interface ForumsService {
  createForum(payload: ForumCreatePayload): Promise<ForumDetail | void>;
  listForums(query?: ForumListQuery): Promise<ForumListResponse | void>;
  getForum(slug: string): Promise<ForumDetail | void>;
  deleteForum(slug: string): Promise<void>;
  followForum(slug: string): Promise<void>;
  unfollowForum(slug: string): Promise<void>;
  updateModerator(slug: string, userId: string, payload: ModeratorUpdatePayload): Promise<void>;
}

export const createForumsService = (client: ApiClient): ForumsService => ({
  createForum: (payload) =>
    client.request<ForumDetail | void>({
      path: '/forums',
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),
  listForums: (query) =>
    client.request<ForumListResponse | void>({
      path: '/forums',
      method: 'GET',
      query,
    }),
  getForum: (slug) =>
    client.request<ForumDetail | void>({
      path: `/forums/${encodeURIComponent(slug)}`,
      method: 'GET',
    }),
  deleteForum: (slug) =>
    client.request<void>({
      path: `/forums/${encodeURIComponent(slug)}`,
      method: 'DELETE',
      requiresAuth: true,
    }),
  followForum: (slug) =>
    client.request<void>({
      path: `/forums/${encodeURIComponent(slug)}/follow`,
      method: 'POST',
      requiresAuth: true,
    }),
  unfollowForum: (slug) =>
    client.request<void>({
      path: `/forums/${encodeURIComponent(slug)}/follow`,
      method: 'DELETE',
      requiresAuth: true,
    }),
  updateModerator: (slug, userId, payload) =>
    client.request<void>({
      path: `/forums/${encodeURIComponent(slug)}/moderators/${encodeURIComponent(userId)}`,
      method: 'PATCH',
      body: payload,
      requiresAuth: true,
    }),
});
