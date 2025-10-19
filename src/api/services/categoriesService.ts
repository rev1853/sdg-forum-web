import type { ApiClient } from '../client';
import type { CategoryListResponse, CategorySummary } from '../models';

export interface CategoriesService {
  list(): Promise<CategorySummary[]>;
}

export const createCategoriesService = (client: ApiClient): CategoriesService => ({
  list: async () => {
    const response = await client.request<CategoryListResponse>({
      path: '/categories',
      method: 'GET',
    });

    return response?.categories ?? [];
  },
});
