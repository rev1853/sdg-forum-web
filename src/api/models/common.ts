export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface PaginatedResponse<T = unknown> {
  data?: T[];
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface IdentifierParams {
  id: string;
}

export type EntityStatus = 'ACTIVE' | 'REMOVED';
