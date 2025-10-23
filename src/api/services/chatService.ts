import type { ApiClient } from '../client';
import type {
  ChatGroup,
  ChatGroupDetail,
  ChatGroupListQuery,
  ChatGroupListResponse,
  ChatJoinResponse,
  ChatMessage,
  ChatMessageListQuery,
  ChatMessageListResponse,
} from '../models';

const normalizeGroupsQuery = (query?: ChatGroupListQuery) => {
  if (!query) return undefined;
  const normalized: Record<string, string | number> = {};

  if (query.page !== undefined) {
    normalized.page = query.page;
  }

  if (query.pageSize !== undefined) {
    normalized.pageSize = query.pageSize;
  }

  return normalized;
};

const normalizeMessagesQuery = (query?: ChatMessageListQuery) => {
  if (!query) return undefined;
  const normalized: Record<string, string | number> = {};

  if (query.after) {
    normalized.after = query.after;
  }

  if (query.limit !== undefined) {
    normalized.limit = query.limit;
  }

  return normalized;
};

export interface ChatService {
  listGroups(query?: ChatGroupListQuery): Promise<ChatGroupListResponse | void>;
  getGroup(groupId: string): Promise<ChatGroupDetail | ChatGroup | void>;
  joinGroup(groupId: string): Promise<ChatJoinResponse | void>;
  leaveGroup(groupId: string): Promise<void>;
  listMessages(groupId: string, query?: ChatMessageListQuery): Promise<ChatMessageListResponse | { messages?: ChatMessage[] } | void>;
}

const encodeId = (value: string) => encodeURIComponent(value);

export const createChatService = (client: ApiClient): ChatService => ({
  listGroups: (query) =>
    client.request<ChatGroupListResponse | void>({
      path: '/chat/groups',
      method: 'GET',
      query: normalizeGroupsQuery(query),
    }),
  getGroup: (groupId) =>
    client.request<ChatGroupDetail | ChatGroup | void>({
      path: `/chat/groups/${encodeId(groupId)}`,
      method: 'GET',
    }),
  joinGroup: (groupId) =>
    client.request<ChatJoinResponse | void>({
      path: `/chat/groups/${encodeId(groupId)}/join`,
      method: 'POST',
      requiresAuth: true,
    }),
  leaveGroup: (groupId) =>
    client.request<void>({
      path: `/chat/groups/${encodeId(groupId)}/join`,
      method: 'DELETE',
      requiresAuth: true,
    }),
  listMessages: (groupId, query) =>
    client.request<ChatMessageListResponse | { messages?: ChatMessage[] } | void>({
      path: `/chat/groups/${encodeId(groupId)}/messages`,
      method: 'GET',
      requiresAuth: true,
      query: normalizeMessagesQuery(query),
    }),
});
