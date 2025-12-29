import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id?: number;
  username: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = Cookies.get('access_token');
    const username = Cookies.get('username');
    const userId = Cookies.get('user_id');
    
    if (token && username) {
      setUser({ id: userId ? parseInt(userId) : undefined, username });
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/users/login/', {
        username,
        password,
      });

      const { access, refresh, user } = response.data;
      
      // Store tokens, username, and user ID
      Cookies.set('access_token', access, { expires: 1 });
      Cookies.set('refresh_token', refresh, { expires: 7 });
      Cookies.set('username', username, { expires: 7 });
      if (user?.id) {
        Cookies.set('user_id', user.id.toString(), { expires: 7 });
      }

      setUser({ id: user?.id, username });
      
      router.push('/social');
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      await api.post('/users/register/', {
        username,
        email,
        password,
      });

      // Auto-login after registration
      await login(username, password);
    } catch (error: any) {
      const errorMsg = error.response?.data?.username?.[0] ||
                      error.response?.data?.email?.[0] ||
                      error.response?.data?.detail ||
                      'Registration failed';
      throw new Error(errorMsg);
    }
  };

  const logout = () => {
    // Clear tokens and user
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('username');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
