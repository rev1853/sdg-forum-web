import type { ApiClient } from '../client';
import type {
  ThreadCreatePayload,
  ThreadDetail,
  ThreadListQuery,
  ThreadListResponse,
} from '../models';

export interface ThreadsService {
  createThread(slug: string, payload: ThreadCreatePayload): Promise<ThreadDetail | void>;
  listThreads(slug: string, query?: ThreadListQuery): Promise<ThreadListResponse | void>;
  getThread(threadId: string): Promise<ThreadDetail | void>;
}

const serializeThreadPayload = (payload: ThreadCreatePayload): FormData => {
  const formData = new FormData();
  formData.set('body', payload.body);

  if (payload.media instanceof File) {
    formData.set('media', payload.media);
  } else if (payload.media instanceof Blob) {
    formData.set('media', payload.media, 'upload');
  } else if (typeof payload.media === 'string') {
    formData.set('media', payload.media);
  }

  return formData;
};

export const createThreadsService = (client: ApiClient): ThreadsService => ({
  createThread: (slug, payload) =>
    client.request<ThreadDetail | void>({
      path: `/forums/${encodeURIComponent(slug)}/threads`,
      method: 'POST',
      body: serializeThreadPayload(payload),
      requiresAuth: true,
    }),
  listThreads: (slug, query) =>
    client.request<ThreadListResponse | void>({
      path: `/forums/${encodeURIComponent(slug)}/threads`,
      method: 'GET',
      query,
    }),
  getThread: (threadId) =>
    client.request<ThreadDetail | void>({
      path: `/threads/${encodeURIComponent(threadId)}`,
      method: 'GET',
    }),
});
