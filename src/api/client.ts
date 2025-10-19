const FALLBACK_API_BASE_URL = 'https://sdg-forum-api.truesurvi4.xyz';

const sanitizeBaseUrl = (value: string | undefined | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        const normalizedPath = parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname;
        return `${parsed.origin}${normalizedPath}`;
    } catch {
        return null;
    }
};

const DEFAULT_API_BASE_URL = sanitizeBaseUrl(import.meta.env.VITE_API_BASE_URL) ?? FALLBACK_API_BASE_URL;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface ApiClientOptions {
    baseUrl?: string;
    /**
     * Lazily read the access token so callers can keep it in state.
     */
    getAccessToken?: () => string | null | undefined;
    /**
     * Hook that fires when a request returns 401. Useful for logout flows.
     */
    onUnauthorized?: () => void;
}

export interface ApiRequestConfig<
    TBody = unknown,
    TQuery extends Record<string, string | number | boolean | undefined> | undefined =
    Record<string, string | number | boolean | undefined>,
> {
    path: string;
    method?: HttpMethod;
    query?: TQuery;
    body?: TBody;
    headers?: Record<string, string>;
    requiresAuth?: boolean;
    signal?: AbortSignal;
}

export interface ApiClient {
    baseUrl: string;
    request<TResponse = unknown, TBody = unknown>(
        config: ApiRequestConfig<TBody>,
    ): Promise<TResponse>;
}

export class ApiError<T = unknown> extends Error {
    status: number;
    statusText: string;
    data: T | undefined;

    constructor(message: string, status: number, statusText: string, data: T | undefined) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
        this.data = data;
    }
}

const isFormData = (value: unknown): value is FormData => value instanceof FormData;

const buildUrl = (
    baseUrl: string,
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
): string => {
    const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

    if (query) {
        Object.entries(query).forEach(([key, rawValue]) => {
            if (rawValue === undefined || rawValue === null) return;
            url.searchParams.set(key, String(rawValue));
        });
    }

    return url.toString();
};

const parseResponseBody = async <T>(response: Response): Promise<T | undefined> => {
    if (response.status === 204) {
        return undefined;
    }

    const contentType = response.headers.get('content-type');

    if (!contentType) {
        return undefined;
    }

    if (contentType.includes('application/json')) {
        return (await response.json()) as T;
    }

    if (contentType.startsWith('text/')) {
        return (await response.text()) as unknown as T;
    }

    return undefined;
};

const readErrorPayload = async (response: Response): Promise<unknown> => {
    try {
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            return await response.json();
        }
        return await response.text();
    } catch {
        return undefined;
    }
};

export const createApiClient = (options: ApiClientOptions = {}): ApiClient => {
    const baseUrl = sanitizeBaseUrl(options.baseUrl) ?? DEFAULT_API_BASE_URL;

    const request: ApiClient['request'] = async (config) => {
        const {
            method = 'GET',
            path,
            query,
            body,
            headers: customHeaders = {},
            requiresAuth = false,
            signal,
        } = config;

        const headers = new Headers(customHeaders);
        const accessToken = requiresAuth ? options.getAccessToken?.() : undefined;

        if (requiresAuth && accessToken) {
            headers.set('Authorization', `Bearer ${accessToken}`);
        }

        let payload: BodyInit | undefined;

        if (body !== undefined && body !== null) {
            if (isFormData(body)) {
                payload = body;
            } else if (body instanceof URLSearchParams || body instanceof Blob) {
                payload = body;
            } else if (typeof body === 'string') {
                payload = body;
                headers.set('Content-Type', headers.get('Content-Type') ?? 'text/plain');
            } else {
                payload = JSON.stringify(body);
                headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
            }
        }

        const response = await fetch(
            buildUrl(baseUrl, path, query as Record<string, string | number | boolean | undefined>),
            {
                method,
                headers,
                body: payload,
                signal,
            },
        );

        if (!response.ok) {
            if (response.status === 401) {
                options.onUnauthorized?.();
            }

            const errorPayload = await readErrorPayload(response);
            throw new ApiError(
                `Request to ${path} failed with status ${response.status}`,
                response.status,
                response.statusText,
                errorPayload,
            );
        }

        return (await parseResponseBody(response)) as TResponse;
    };

    return {
        baseUrl,
        request,
    };
};

export { DEFAULT_API_BASE_URL };
