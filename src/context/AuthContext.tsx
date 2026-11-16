import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StaffUser } from '../types';
import { useRepository } from '../data';
import { clearAllClientCaches } from '../utils/inMemoryCache';

interface AuthContextType {
  user: StaffUser | null;
  loading: boolean;
  login: (identifier: string, password?: string, rememberMe?: boolean) => Promise<StaffUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repository = useRepository();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      // In development mode, auto-migrate to fresh sample data spanning 4 dates if not yet updated.
      // In production, ensure seed users exist without resetting user data.
      const sampleDataVersion = localStorage.getItem('sk_sample_data_version');
      if (import.meta.env.DEV && sampleDataVersion !== 'v7') {
        await repository.resetToSampleData();
        localStorage.setItem('sk_sample_data_version', 'v7');
      } else {
        await repository.seedInitialData();
      }
      const currentUser = await repository.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Failed to load user:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password?: string, rememberMe: boolean = true): Promise<StaffUser> => {
    clearAllClientCaches(); // Purge cache on user login/switch
    const loggedUser = await repository.login(identifier, password, rememberMe);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = async (): Promise<void> => {
    clearAllClientCaches(); // Purge all in-memory signed URLs and query caches
    await repository.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

