import type { ApiClient } from '../client';
import type { CommentStatusUpdatePayload, ThreadStatusUpdatePayload } from '../models';

export interface ModerationService {
  updateCommentStatus(commentId: string, payload: CommentStatusUpdatePayload): Promise<void>;
  updateThreadStatus(threadId: string, payload: ThreadStatusUpdatePayload): Promise<void>;
}

export const createModerationService = (client: ApiClient): ModerationService => ({
  updateCommentStatus: (commentId, payload) =>
    client.request<void>({
      path: `/comments/${encodeURIComponent(commentId)}/status`,
      method: 'PATCH',
      body: payload,
      requiresAuth: true,
    }),
  updateThreadStatus: (threadId, payload) =>
    client.request<void>({
      path: `/threads/${encodeURIComponent(threadId)}/status`,
      method: 'PATCH',
      body: payload,
      requiresAuth: true,
    }),
});
