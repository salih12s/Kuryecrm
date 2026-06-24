import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStorage } from '../lib/api';
import type { LoginResponse, MeResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, if a token exists, restore the session via /auth/me.
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get<MeResponse>('/auth/me')
      .then((res) => {
        setUser({
          id: res.data.id,
          name: res.data.name,
          username: res.data.username,
          role: res.data.role,
          financeEditable: res.data.financeEditable,
        });
      })
      .catch(() => {
        tokenStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await api.post<LoginResponse>('/auth/login', { username, password });
    tokenStorage.set(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    tokenStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
