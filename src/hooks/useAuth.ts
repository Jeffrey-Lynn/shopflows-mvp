"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const STORAGE_KEY = "shopflows_session";

export type UserRole = "platform_admin" | "shop_admin" | "supervisor" | "shop_user";

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
  /** Supabase Auth user ID */
  authUserId?: string;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from users table by auth_user_id
  const fetchUserData = useCallback(async (authUser: SupabaseUser): Promise<Session | null> => {
    try {
      // Use RPC to bypass RLS
      const { data, error } = await supabase.rpc('get_user_by_auth_id', {
        p_auth_id: authUser.id,
      });

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      // RPC returns array, get first row
      const userData = Array.isArray(data) && data.length > 0 ? data[0] : data;

      if (!userData) {
        console.warn('No user found for auth_user_id:', authUser.id);
        return null;
      }

      const sessionData: Session = {
        isAuthenticated: true,
        orgId: userData.org_id || '',
        shopId: userData.org_id || '', // backward compat
        role: userData.role as UserRole,
        userId: userData.id,
        email: userData.email || authUser.email,
        name: userData.full_name || '',
        authUserId: authUser.id,
      };

      return sessionData;
    } catch (err) {
      console.error('Error in fetchUserData:', err);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    const initAuth = async () => {
      // First check localStorage for existing session (backward compat)
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Session;
          if (mounted) setSession(parsed);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Then check Supabase Auth session
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        const userData = await fetchUserData(authSession.user);
        if (userData && mounted) {
          setSession(userData);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        }
      }

      if (mounted) setLoading(false);
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, authSession) => {
        if (event === 'SIGNED_IN' && authSession?.user) {
          const userData = await fetchUserData(authSession.user);
          if (userData && mounted) {
            setSession(userData);
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setSession(null);
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

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

  const logout = async () => {
    // Sign out from Supabase Auth
    await supabase.auth.signOut();
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
