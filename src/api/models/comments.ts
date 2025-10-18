import type { EntityStatus } from './common';

export interface CommentCreatePayload {
  body: string;
}

export interface Comment {
  id?: string;
  body?: string;
  threadId?: string;
  authorId?: string;
  status?: EntityStatus;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CommentStatusUpdatePayload {
  status: EntityStatus;
}
