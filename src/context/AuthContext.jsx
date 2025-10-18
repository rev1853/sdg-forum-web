import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'sdgForumUser';

const AuthContext = createContext({
  user: null,
  login: () => undefined,
  logout: () => undefined,
  isReady: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email) {
          setUser(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to read stored user', error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = ({ email, name }) => {
    if (!email) return;

    const nextUser = {
      email,
      name: name?.trim() || email.split('@')[0]
    };

    setUser(nextUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } catch (error) {
      console.error('Failed to persist user', error);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored user', error);
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isReady
    }),
    [user, isReady]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
