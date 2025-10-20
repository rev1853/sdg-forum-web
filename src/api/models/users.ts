import type { PaginatedResponse } from './common';
import type { ThreadSummary } from './threads';

export interface UserCounts {
  threads?: number;
  interactions?: number;
  reportsFiled?: number;
  [key: string]: unknown;
}

export interface UserProfile {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  profilePicture?: string | null;
  profile_picture?: string | null;
  createdAt?: string;
  created_at?: string;
  _count?: UserCounts;
  [key: string]: unknown;
}

export interface UserResponse {
  user?: UserProfile;
  [key: string]: unknown;
}

export interface UserThreadsResponse extends PaginatedResponse<ThreadSummary> {}

export interface UserUpdatePayload {
  email?: string;
  username?: string;
  name?: string;
  removeProfilePicture?: boolean;
  profilePicture?: File | Blob | string | null;
}
