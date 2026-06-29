import React, {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from 'react';
import { storage } from '../services/storage';
import { authApi, User } from '../services/api';
import { registerPushNotifications } from '../services/notifications';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: import('../services/api').UserPreferences) => Promise<void>;
  refreshUser: () => Promise<void>;
  needsPreferences: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const res = await authApi.getMe();
    const data = res.data.data;
    setUser({
      ...data,
      subscribedCategories: [...(data.subscribedCategories || [])],
      notificationCategories: [...(data.notificationCategories || [])],
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getItem('token');
        if (token) {
          await refreshUser();
          registerPushNotifications().catch(() => {});
        }
      } catch {
        await storage.deleteItem('token');
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const login = useCallback(async (idToken: string) => {
    const res = await authApi.googleLogin(idToken);
    await storage.setItem('token', res.data.data.token);
    setUser(res.data.data.user);
    registerPushNotifications().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await storage.deleteItem('token');
    setUser(null);
  }, []);

  const updatePreferences = useCallback(async (prefs: import('../services/api').UserPreferences) => {
    const res = await authApi.updatePreferences(prefs);
    const data = res.data.data;
    setUser({
      ...data,
      subscribedCategories: [...(data.subscribedCategories || [])],
      notificationCategories: [...(data.notificationCategories || [])],
    });
  }, []);

  const needsPreferences = !!user && (!user.subscribedCategories || user.subscribedCategories.length === 0);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updatePreferences, refreshUser, needsPreferences }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
