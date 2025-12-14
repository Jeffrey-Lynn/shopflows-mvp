"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "shopflows_session";

export type UserRole = "platform_admin" | "shop_admin" | "shop_user";

export type Session = {
  isAuthenticated: boolean;
  /** Organization ID (primary identifier) */
  orgId: string;
  /** @deprecated Use orgId instead. Kept for backward compatibility. */
  shopId: string;
  role: UserRole;
  userId?: string;
  deviceId?: string;
  deviceName?: string;
  email?: string;
  name?: string;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Session;
        setSession(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Device login (PIN-based, for kiosks)
  const loginDevice = (data: {
    orgId?: string;
    shopId?: string;  // @deprecated - use orgId
    deviceId: string;
    deviceName: string;
    userId: string;
    name?: string;
  }) => {
    const orgId = data.orgId || data.shopId || '';
    const next: Session = {
      isAuthenticated: true,
      orgId,
      shopId: orgId,  // backward compat
      role: "shop_user",
      userId: data.userId,
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      name: data.name,
    };
    setSession(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  // Admin login (email/password)
  const loginAdmin = (data: {
    orgId?: string;
    shopId?: string;  // @deprecated - use orgId
    userId: string;
    email: string;
    name: string;
    role: UserRole;
  }) => {
    const orgId = data.orgId || data.shopId || '';
    const next: Session = {
      isAuthenticated: true,
      orgId,
      shopId: orgId,  // backward compat
      role: data.role,
      userId: data.userId,
      email: data.email,
      name: data.name,
    };
    setSession(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  // Legacy login for backward compatibility
  const login = (orgIdOrShopId: string) => {
    const next: Session = {
      isAuthenticated: true,
      orgId: orgIdOrShopId,
      shopId: orgIdOrShopId,  // backward compat
      role: "shop_user",
    };
    setSession(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const logout = () => {
    setSession(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const isAdmin = session?.role === "shop_admin" || session?.role === "platform_admin";
  const isPlatformAdmin = session?.role === "platform_admin";

  return {
    session,
    loading,
    login,
    loginDevice,
    loginAdmin,
    logout,
    isAdmin,
    isPlatformAdmin,
  };
}
