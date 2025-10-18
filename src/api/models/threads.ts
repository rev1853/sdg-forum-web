import type { EntityStatus, PaginatedQuery, PaginatedResponse } from './common';

export interface ThreadCreatePayload {
  body: string;
  media?: File | Blob | string | null;
}

export interface ThreadSummary {
  id?: string;
  slug?: string;
  body?: string;
  authorId?: string;
  forumSlug?: string;
  createdAt?: string;
  updatedAt?: string;
  mediaUrl?: string | null;
  commentCount?: number;
  [key: string]: unknown;
}

export interface ThreadDetail extends ThreadSummary {
  author?: Record<string, unknown>;
  forum?: Record<string, unknown>;
  comments?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ThreadListQuery extends PaginatedQuery {}

export interface ThreadListResponse extends PaginatedResponse<ThreadSummary> {}

export interface ThreadStatusUpdatePayload {
  status: EntityStatus;
}
