import type { ApiClient } from '../client';
import type {
  ThreadCreatePayload,
  ThreadDetail,
  ThreadListQuery,
  ThreadListResponse,
  ThreadRepliesResponse,
  ThreadReportPayload,
  ThreadReplyPayload,
} from '../models';

const appendArrayValues = (formData: FormData, key: string, values: string[] | undefined): void => {
  if (!values || values.length === 0) return;
  values.filter(Boolean).forEach((value) => formData.append(key, value));
};

const serializeThreadPayload = (payload: ThreadCreatePayload | ThreadReplyPayload): FormData => {
  const formData = new FormData();

  if ('title' in payload && payload.title) {
    formData.set('title', payload.title);
  }

  formData.set('body', payload.body);

  appendArrayValues(formData, 'categoryIds', payload.categoryIds);
  appendArrayValues(formData, 'tags', payload.tags);

  if (payload.image instanceof File) {
    formData.set('image', payload.image);
  } else if (payload.image instanceof Blob) {
    formData.set('image', payload.image, 'upload');
  }

  return formData;
};

const normalizeQuery = (query?: ThreadListQuery) => {
  if (!query) return query;
  const normalized: Record<string, string | number> = {};

  if (query.page !== undefined) {
    normalized.page = query.page;
  }

  if (query.pageSize !== undefined) {
    normalized.pageSize = query.pageSize;
  }

  if (query.search) {
    normalized.search = query.search;
  }

  if (query.tags) {
    normalized.tags = Array.isArray(query.tags) ? query.tags.filter(Boolean).join(',') : query.tags;
  }

  if (query.categories) {
    normalized.categories = Array.isArray(query.categories)
      ? query.categories.filter(Boolean).join(',')
      : query.categories;
  }

  return normalized;
};

export interface ThreadsService {
  createThread(payload: ThreadCreatePayload): Promise<ThreadDetail | void>;
  listThreads(query?: ThreadListQuery): Promise<ThreadListResponse | void>;
  getThread(threadId: string): Promise<ThreadDetail | void>;
  listReplies(threadId: string, query?: ThreadListQuery): Promise<ThreadRepliesResponse | void>;
  createReply(threadId: string, payload: ThreadReplyPayload): Promise<ThreadDetail | void>;
  likeThread(threadId: string): Promise<void>;
  unlikeThread(threadId: string): Promise<void>;
  repostThread(threadId: string): Promise<void>;
  removeRepost(threadId: string): Promise<void>;
  reportThread(threadId: string, payload: ThreadReportPayload): Promise<void>;
}

export const createThreadsService = (client: ApiClient): ThreadsService => ({
  createThread: (payload) =>
    client.request<ThreadDetail | void>({
      path: '/threads',
      method: 'POST',
      body: serializeThreadPayload(payload),
      requiresAuth: true,
    }),
  listThreads: (query) =>
    client.request<ThreadListResponse | void>({
      path: '/threads',
      method: 'GET',
      query: normalizeQuery(query),
    }),
  getThread: (threadId) =>
    client.request<ThreadDetail | void>({
      path: `/threads/${encodeURIComponent(threadId)}`,
      method: 'GET',
    }),
  listReplies: (threadId, query) =>
    client.request<ThreadRepliesResponse | void>({
      path: `/threads/${encodeURIComponent(threadId)}/replies`,
      method: 'GET',
      query: normalizeQuery(query),
    }),
  createReply: (threadId, payload) =>
    client.request<ThreadDetail | void>({
      path: `/threads/${encodeURIComponent(threadId)}/replies`,
      method: 'POST',
      body: serializeThreadPayload(payload),
      requiresAuth: true,
    }),
  likeThread: (threadId) =>
    client.request<void>({
      path: `/threads/${encodeURIComponent(threadId)}/like`,
      method: 'POST',
      requiresAuth: true,
    }),
  unlikeThread: (threadId) =>
    client.request<void>({
      path: `/threads/${encodeURIComponent(threadId)}/like`,
      method: 'DELETE',
      requiresAuth: true,
    }),
  repostThread: (threadId) =>
    client.request<void>({
      path: `/threads/${encodeURIComponent(threadId)}/repost`,
      method: 'POST',
      requiresAuth: true,
    }),
  removeRepost: (threadId) =>
    client.request<void>({
      path: `/threads/${encodeURIComponent(threadId)}/repost`,
      method: 'DELETE',
      requiresAuth: true,
    }),
  reportThread: (threadId, payload) =>
    client.request<void>({
      path: `/threads/${encodeURIComponent(threadId)}/report`,
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),
});
