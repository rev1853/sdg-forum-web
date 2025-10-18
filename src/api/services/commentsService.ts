import type { ApiClient } from '../client';
import type { Comment, CommentCreatePayload } from '../models';

export interface CommentsService {
  createComment(threadId: string, payload: CommentCreatePayload): Promise<Comment | void>;
}

export const createCommentsService = (client: ApiClient): CommentsService => ({
  createComment: (threadId, payload) =>
    client.request<Comment | void>({
      path: `/threads/${encodeURIComponent(threadId)}/comments`,
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),
});
