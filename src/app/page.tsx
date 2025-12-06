"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session?.isAuthenticated) {
      router.replace("/track");
    } else {
      router.replace("/login");
    }
  }, [loading, session, router]);

  return null;
}
