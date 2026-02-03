"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { getProfileApi, loginApi, DashboardModuleKey } from "@/lib/api";

type UserRole = "admin" | "client" | "user";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /**
   * Optional list of dashboard modules this user is allowed to see.
   *
   * When provided, the dashboard layout and sidebar will be driven
   * primarily by this list instead of static role checks.
   */
  modules?: DashboardModuleKey[] | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  isAdmin: () => boolean;
  isClient: () => boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getProfileApi();
      setUser(userData as User);
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await loginApi(email, password);
    if (typeof window !== "undefined") {
      localStorage.setItem("token", data.access_token);
    }
    await loadUser();
    router.replace("/dashboard");
  };

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]) => {
      if (!user) return false;
      if (Array.isArray(roles)) {
        return roles.includes(user.role);
      }
      return user.role === roles;
    },
    [user]
  );

  const isAdmin = useCallback(() => hasRole("admin"), [hasRole]);
  const isClient = useCallback(() => hasRole("client"), [hasRole]);

  const value: AuthContextValue = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAdmin,
    isClient,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

