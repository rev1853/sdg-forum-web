import type { PaginatedQuery, PaginatedResponse } from './common';

export interface ForumCreatePayload {
  title: string;
  description?: string;
  categoryIds?: string[];
}

export interface ForumSummary {
  id?: string;
  slug?: string;
  title?: string;
  description?: string;
  followerCount?: number;
  threadCount?: number;
  [key: string]: unknown;
}

export interface ForumDetail extends ForumSummary {
  categories?: Array<{ id?: string; name?: string; [key: string]: unknown }>;
  moderators?: Array<{ id?: string; name?: string; username?: string; [key: string]: unknown }>;
  isFollowing?: boolean;
  [key: string]: unknown;
}

export interface ForumListQuery extends PaginatedQuery {}

export interface ForumListResponse extends PaginatedResponse<ForumSummary> {}

export interface ModeratorUpdatePayload {
  isModerator: boolean;
}
