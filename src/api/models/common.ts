export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T = unknown> {
  data?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export interface IdentifierParams {
  id: string;
}

export type EntityStatus = 'ACTIVE' | 'REMOVED';
