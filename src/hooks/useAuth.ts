"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "shopflows_device_session";

type DeviceSession = {
  isAuthenticated: boolean;
  shopId: string;
};

export function useAuth() {
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DeviceSession;
        setSession(parsed);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (shopId: string) => {
    const next: DeviceSession = { isAuthenticated: true, shopId };
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

  return { session, loading, login, logout };
}
