export interface CategorySummary {
  id?: string;
  name?: string;
  sdgNumber?: number;
  sdg_number?: number;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface CategoryListResponse {
  categories?: CategorySummary[];
  [key: string]: unknown;
}
