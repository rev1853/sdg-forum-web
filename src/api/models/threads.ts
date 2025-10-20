import type { PaginatedQuery, PaginatedResponse } from './common';

export interface ThreadCounts {
  likes?: number;
  reposts?: number;
  replies?: number;
  [key: string]: unknown;
}

export interface ThreadCategory {
  id?: string;
  name?: string;
  sdgNumber?: number;
  sdg_number?: number;
  [key: string]: unknown;
}

export interface ThreadAuthor {
  id?: string;
  username?: string;
  name?: string;
  profilePicture?: string | null;
  profile_picture?: string | null;
  [key: string]: unknown;
}

export interface ThreadSummary {
  id?: string;
  authorId?: string;
  author_id?: string;
  parentThreadId?: string | null;
  parent_thread_id?: string | null;
  title?: string;
  body?: string;
  image?: string | null;
  tags?: string[] | null;
  status?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  author?: ThreadAuthor;
  categories?: ThreadCategory[];
  counts?: ThreadCounts;
  parent?: ThreadSummary | null;
  replies?: ThreadSummary[];
  [key: string]: unknown;
}

export interface ThreadDetail extends ThreadSummary {}

export interface ThreadListQuery extends PaginatedQuery {
  tags?: string | string[];
  categories?: string | string[];
  search?: string;
}

export interface ThreadListResponse extends PaginatedResponse<ThreadSummary> {}

export interface ThreadRepliesResponse extends PaginatedResponse<ThreadSummary> {}

export interface ThreadCreatePayload {
  title: string;
  body: string;
  categoryIds: string[];
  tags?: string[];
  image?: File | Blob | string | null;
}

export interface ThreadReplyPayload {
  body: string;
  title?: string;
  categoryIds?: string[];
  tags?: string[];
  image?: File | Blob | string | null;
}

export interface ThreadReportPayload {
  reasonCode: string;
  message?: string;
}

export interface ThreadStatusUpdatePayload {
  status: string;
}
