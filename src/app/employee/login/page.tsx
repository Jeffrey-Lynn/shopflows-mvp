"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

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
    maxWidth: "400px",
    backgroundColor: "#1a1a1a",
    borderRadius: "24px",
    padding: "40px 32px",
    border: "1px solid #2a2a2a",
  },
  logo: {
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  logoText: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.25em",
    color: "#3b82f6",
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#ffffff",
    marginTop: "16px",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
  },
  form: {
    marginTop: "32px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#a0a0a0",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    backgroundColor: "#0a0a0a",
    color: "#ffffff",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.15s ease",
  } as React.CSSProperties,
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "12px",
    padding: "14px 16px",
    marginBottom: "20px",
    fontSize: "14px",
    color: "#ef4444",
    textAlign: "center" as const,
  },
  submitBtn: {
    width: "100%",
    padding: "18px",
    borderRadius: "12px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginTop: "8px",
  } as React.CSSProperties,
  links: {
    marginTop: "24px",
    textAlign: "center" as const,
    fontSize: "14px",
    color: "#666666",
  },
  link: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: 500,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    margin: "24px 0",
    color: "#444444",
    fontSize: "13px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "#2a2a2a",
  },
};

export default function EmployeeLoginPage() {
  const router = useRouter();
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log("=== Employee Login Debug ===");
    console.log("1. Attempting login with email:", email.trim());

    try {
      // Sign in with Supabase Auth
      console.log("2. Calling supabase.auth.signInWithPassword...");
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log("3. Supabase Auth Response:");
      console.log("   - authData:", authData);
      console.log("   - authData.user:", authData?.user);
      console.log("   - authData.user.id:", authData?.user?.id);
      console.log("   - authError:", authError);

      if (authError) {
        console.log("4. AUTH ERROR:", authError.message, authError);
        setError(authError.message);
        return;
      }

      if (!authData.user) {
        console.log("4. NO USER in authData");
        setError("Login failed. Please try again.");
        return;
      }

      console.log("4. Auth successful! User ID:", authData.user.id);
      console.log("5. Fetching user profile from users table...");
      console.log("   - Looking for auth_id:", authData.user.id);

      // First try direct query to users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, full_name, role, org_id, auth_id, email")
        .eq("auth_id", authData.user.id)
        .single();

      console.log("6. Users table query result:");
      console.log("   - userData:", userData);
      console.log("   - userError:", userError);

      // If direct query fails, try the RPC
      if (userError) {
        console.log("7. Direct query failed, trying get_user_by_auth_id RPC...");
        console.log("   - Passing auth_id:", authData.user.id);
        
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_user_by_auth_id", {
          p_auth_id: authData.user.id,
        });

        console.log("8. RPC Result:");
        console.log("   - rpcData:", rpcData);
        console.log("   - rpcError:", rpcError);

        if (rpcError) {
          console.log("9. RPC ERROR:", rpcError.message, rpcError);
          setError(`User profile error: ${rpcError.message}`);
          return;
        }

        // RPC returns array, get first row
        const rpcUserData = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData;
        console.log("9. Parsed RPC userData:", rpcUserData);

        if (!rpcUserData) {
          console.log("10. NO USER FOUND via RPC");
          setError("User profile not found. Please contact your administrator.");
          return;
        }

        // Store session info from RPC data
        console.log("10. Storing session from RPC data...");
        loginAdmin({
          userId: rpcUserData.id,
          email: authData.user.email || "",
          name: rpcUserData.full_name,
          role: rpcUserData.role,
          orgId: rpcUserData.org_id,
        });

        // Redirect based on role
        console.log("11. Redirecting based on role:", rpcUserData.role);
        if (rpcUserData.role === "platform_admin") {
          router.replace("/platform");
        } else if (rpcUserData.role === "shop_admin" || rpcUserData.role === "supervisor") {
          router.replace("/admin");
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      if (!userData) {
        console.log("7. NO USER DATA from direct query");
        setError("User profile not found. Please contact your administrator.");
        return;
      }

      console.log("7. User profile found:", userData);

      // Store session info
      console.log("8. Storing session info...");
      loginAdmin({
        userId: userData.id,
        email: authData.user.email || "",
        name: userData.full_name,
        role: userData.role,
        orgId: userData.org_id,
      });

      // Redirect based on role
      console.log("9. Redirecting based on role:", userData.role);
      if (userData.role === "platform_admin") {
        router.replace("/platform");
      } else if (userData.role === "shop_admin" || userData.role === "supervisor") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("=== CATCH BLOCK ERROR ===");
      console.error("Error type:", typeof err);
      console.error("Error:", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
      }
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
      console.log("=== Login attempt finished ===");
    }
  };

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <p style={s.logoText}>ShopFlows</p>
          <h1 style={s.title}>Employee Login</h1>
          <p style={s.subtitle}>Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          {error && <div style={s.error}>{error}</div>}

          <div style={s.formGroup}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              style={s.input}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; }}
            />
          </div>

          <div style={s.formGroup}>
            <label style={s.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={s.input}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...s.submitBtn,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span>or</span>
          <div style={s.dividerLine} />
        </div>

        <div style={s.links}>
          <p>
            Using a shared device?{" "}
            <a href="/login" style={s.link}>
              PIN Login
            </a>
          </p>
          <p style={{ marginTop: "12px" }}>
            Shop admin?{" "}
            <a href="/admin/login" style={s.link}>
              Admin Login
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
