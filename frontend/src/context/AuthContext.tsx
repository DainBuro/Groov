import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, LoginRequest, SignupRequest, RoleType } from '../types';
import { login as loginApi, signup as signupApi, logout as logoutApi, getCurrentUser } from '../api/authApi';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (credentials: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in from cookies
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      await loginApi(credentials);
      // After successful login, get user info from backend
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (credentials: SignupRequest) => {
    try {
      await signupApi(credentials);
      // Automatically log in after signup
      await login({
        username: credentials.username,
        password: credentials.password,
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === RoleType.Admin;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        login,
        signup,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
