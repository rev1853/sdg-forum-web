import type { ApiClient } from '../client';
import type { CategoryListResponse, CategorySummary } from '../models';

export interface CategoriesService {
  list(): Promise<CategorySummary[]>;
}

type CategoryResponse =
  | CategoryListResponse
  | CategorySummary[]
  | {
      data?: CategorySummary[];
      items?: CategorySummary[];
      categories?: CategorySummary[];
      [key: string]: unknown;
    };

const normalizeCategories = (payload: CategoryResponse | undefined): CategorySummary[] => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }

  if (typeof payload === 'object') {
    const candidates = [
      (payload as CategoryListResponse).categories,
      (payload as { data?: CategorySummary[] }).data,
      (payload as { items?: CategorySummary[] }).items,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(Boolean);
      }
    }
  }

  return [];
};

export const createCategoriesService = (client: ApiClient): CategoriesService => ({
  list: async () => {
    const response = await client.request<CategoryResponse>({
      path: '/categories',
      method: 'GET',
    });

    return normalizeCategories(response);
  },
});
