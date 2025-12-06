"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { session, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session?.isAuthenticated) {
      // Admins go to admin panel, device users go to track
      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.replace("/track");
      }
    } else {
      router.replace("/login");
    }
  }, [loading, session, isAdmin, router]);

  return null;
}
