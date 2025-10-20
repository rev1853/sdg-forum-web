import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { storeToken, useApi } from '@/api';

const STORAGE_KEY = 'sdgForumUser';

const readStoredUser = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to parse stored user', error);
        return null;
    }
};

const persistUser = user => {
    if (typeof window === 'undefined') return;
    try {
        if (user) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    } catch (error) {
        console.error('Failed to persist user', error);
    }
};

const AuthContext = createContext({
    user: null,
    token: null,
    isReady: false,
    login: async () => undefined,
    logout: () => undefined,
    refreshUser: async () => undefined,
});

export const AuthProvider = ({ children }) => {
    const { auth, users, token, setToken } = useApi();
    const [user, setUser] = useState(() => readStoredUser());
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!token) {
            setUser(null);
            persistUser(null);
        }
    }, [token]);

    const login = useCallback(
        async credentials => {
            const response = await auth.login(credentials);
            if (!response) {
                throw new Error('Unexpected empty response from the API.');
            }

            const issuedToken =
                response.token ||
                response.accessToken ||
                response.access_token ||
                response?.tokens?.accessToken ||
                response?.tokens?.access_token;

            if (!issuedToken) {
                throw new Error('Authentication succeeded but no access token was returned.');
            }

            const nextUser = response.user ?? null;

            storeToken(issuedToken);
            setToken(issuedToken);
            setUser(nextUser);
            persistUser(nextUser);

            return nextUser;
        },
        [auth, setToken]
    );

    const logout = useCallback(() => {
        storeToken(null);
        setToken(null);
        setUser(null);
        persistUser(null);
    }, [setToken]);

    const refreshUser = useCallback(async () => {
        const currentId = user?.id;
        if (!currentId) {
            return null;
        }

        const response = await users.getUser(currentId);
        const updated = response?.user ?? null;
        if (updated) {
            setUser(updated);
            persistUser(updated);
        }
        return updated;
    }, [user?.id, users]);

    const value = useMemo(
        () => ({
            user,
            token,
            isReady,
            login,
            logout,
            refreshUser,
        }),
        [user, token, isReady, login, logout, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
