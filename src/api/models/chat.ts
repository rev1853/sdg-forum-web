import type { PaginatedQuery, PaginatedResponse } from './common';
import type { ThreadCategory } from './threads';
import type { ThreadAuthor } from './threads';

export interface ChatGroupCounts {
  members?: number;
  messages?: number;
  [key: string]: unknown;
}

export interface ChatGroup {
  id?: string;
  name?: string;
  description?: string | null;
  slug?: string | null;
  ownerId?: string;
  owner_id?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  categories?: Array<{
    categoryId?: string;
    category_id?: string;
    category?: ThreadCategory;
    [key: string]: unknown;
  }>;
  _count?: ChatGroupCounts;
  [key: string]: unknown;
}

export interface ChatGroupListQuery extends PaginatedQuery {}

export interface ChatGroupListResponse extends PaginatedResponse<ChatGroup> {}

export interface ChatGroupDetail {
  group?: ChatGroup;
  [key: string]: unknown;
}

export interface ChatMessageAuthor extends ThreadAuthor {}

export interface ChatMessage {
  id?: string;
  groupId?: string;
  group_id?: string;
  senderId?: string;
  sender_id?: string;
  sender?: ChatMessageAuthor;
  author?: ChatMessageAuthor;
  content?: string;
  body?: string;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface ChatMessageListQuery {
  after?: string;
  limit?: number;
}

export interface ChatMessageListResponse extends PaginatedResponse<ChatMessage> {
  messages?: ChatMessage[];
}

export interface ChatJoinResponse {
  success?: boolean;
  [key: string]: unknown;
}
