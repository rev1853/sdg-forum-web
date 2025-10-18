export const ACCESS_TOKEN_KEY = 'sdgForumAccessToken';

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const storeToken = (token: string | null | undefined): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};
