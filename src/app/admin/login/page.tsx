"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth, UserRole } from "@/hooks/useAuth";

const s = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "380px",
    backgroundColor: "#1a1a1a",
    borderRadius: "20px",
    padding: "32px",
    border: "1px solid #2a2a2a",
  },
  logo: {
    textAlign: "center" as const,
    marginBottom: "24px",
  },
  logoText: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.25em",
    color: "#666666",
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#ffffff",
    marginTop: "12px",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    marginTop: "24px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#666666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  input: {
    height: "52px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "16px",
    color: "#ffffff",
    outline: "none",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  button: {
    height: "52px",
    borderRadius: "12px",
    backgroundColor: "#3b82f6",
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginTop: "8px",
  } as React.CSSProperties,
  error: {
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "12px",
    color: "#ef4444",
    fontSize: "14px",
  },
  link: {
    textAlign: "center" as const,
    marginTop: "16px",
    fontSize: "14px",
    color: "#666666",
  },
  linkAnchor: {
    color: "#3b82f6",
    textDecoration: "none",
    marginLeft: "4px",
  },
};

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Supabase Auth response:", { authData, authError });

      if (authError) {
        console.error("Auth error:", authError);
        setError(authError.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Login failed. No user returned.");
        setLoading(false);
        return;
      }

      // Fetch user data from users table
      const { data: userData, error: userError } = await supabase.rpc('get_user_by_auth_id', {
        p_auth_id: authData.user.id,
      });

      console.log("User data response:", { userData, userError });

      if (userError) {
        console.error("Error fetching user data:", userError);
        setError("Failed to load user profile");
        setLoading(false);
        return;
      }

      // RPC returns array, get first row
      const user = Array.isArray(userData) && userData.length > 0 ? userData[0] : userData;

      if (!user) {
        setError("User profile not found. Please contact support.");
        setLoading(false);
        return;
      }

      // Check if user is admin
      if (!['platform_admin', 'shop_admin', 'supervisor'].includes(user.role)) {
        setError("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // Store session in localStorage (useAuth will also handle this via onAuthStateChange)
      loginAdmin({
        orgId: user.org_id || "",
        userId: user.id,
        email: user.email || email,
        name: user.full_name || "",
        role: user.role as UserRole,
      });

      // Redirect based on role
      if (user.role === "platform_admin") {
        router.push("/platform");
      } else {
        router.push("/admin");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <p style={s.logoText}>ShopFlows</p>
          <h1 style={s.title}>Admin Login</h1>
          <p style={s.subtitle}>Sign in to manage your shop</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={s.input}
              autoFocus
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={s.input}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...s.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={s.link}>
          Don&apos;t have an account?
          <a href="/signup" style={s.linkAnchor}>
            Create shop
          </a>
        </p>

        <p style={{ ...s.link, marginTop: "8px" }}>
          <a href="/login" style={s.linkAnchor}>
            Device/Kiosk Login
          </a>
        </p>
      </div>
    </main>
  );
}
