"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    marginBottom: "24px",
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
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
  success: {
    padding: "16px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    borderRadius: "12px",
    color: "#22c55e",
    fontSize: "14px",
    textAlign: "center" as const,
  },
  inviteError: {
    textAlign: "center" as const,
    padding: "40px 20px",
  },
  inviteErrorTitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#ef4444",
    marginBottom: "12px",
  },
  inviteErrorText: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "20px",
    lineHeight: 1.6,
  },
  inviteErrorLink: {
    color: "#3b82f6",
    textDecoration: "none",
  },
};

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginAdmin } = useAuth();
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Invite token state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(true);

  // Validate invite token on mount
  useEffect(() => {
    const validateInvite = async () => {
      const token = searchParams.get("invite");
      
      if (!token) {
        setInviteValid(false);
        setCheckingInvite(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("invite_tokens")
          .select("id, used_at")
          .eq("token", token)
          .maybeSingle();

        if (error || !data) {
          setInviteValid(false);
        } else if (data.used_at) {
          setInviteValid(false); // Already used
        } else {
          setInviteValid(true);
          setInviteToken(token);
        }
      } catch (err) {
        console.error("Error validating invite:", err);
        setInviteValid(false);
      } finally {
        setCheckingInvite(false);
      }
    };

    validateInvite();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteToken) {
      setError("Valid invite token required");
      return;
    }

    if (!shopName || !ownerName || !email || !password) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("signup_shop", {
        p_shop_name: shopName,
        p_owner_name: ownerName,
        p_owner_email: email,
        p_owner_password: password,
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        // Mark invite token as used
        const orgId = data.org_id || data.shop_id;
        await supabase
          .from("invite_tokens")
          .update({ 
            used_at: new Date().toISOString(),
            org_id: orgId,
          })
          .eq("token", inviteToken);

        // Log in the new admin
        loginAdmin({
          orgId: orgId,
          userId: data.user_id,
          email: email,
          name: ownerName,
          role: "shop_admin",
        });
        router.push("/admin");
      } else {
        throw new Error("Signup failed");
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Signup failed. Please try again.";
      if (message.includes("duplicate") || message.includes("unique")) {
        setError("An account with this email already exists");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking invite
  if (checkingInvite) {
    return (
      <main style={s.page}>
        <div style={s.card}>
          <div style={{ textAlign: "center", color: "#666666", padding: "40px" }}>
            Validating invite...
          </div>
        </div>
      </main>
    );
  }

  // Show error if no valid invite
  if (!inviteValid) {
    return (
      <main style={s.page}>
        <div style={s.card}>
          <div style={s.inviteError}>
            <h2 style={s.inviteErrorTitle}>Invite Required</h2>
            <p style={s.inviteErrorText}>
              Signup requires a valid invite link.<br />
              Contact <a href="mailto:support@getshopflows.com" style={s.inviteErrorLink}>support@getshopflows.com</a> to request access.
            </p>
            <p style={{ fontSize: "14px", color: "#666666" }}>
              Already have an account?{" "}
              <a href="/admin/login" style={s.inviteErrorLink}>Sign in</a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <p style={s.logoText}>ShopFlows</p>
          <h1 style={s.title}>Create Your Shop</h1>
          <p style={s.subtitle}>Start tracking vehicles in minutes</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Acme Auto Body"
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

          <div style={s.fieldGroup}>
            <label style={s.label}>Your Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="John Smith"
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

          <div style={s.fieldGroup}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          <div style={s.fieldGroup}>
            <label style={s.label}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Creating Shop..." : "Create Shop"}
          </button>
        </form>

        <p style={s.link}>
          Already have an account?
          <a href="/admin/login" style={s.linkAnchor}>
            Sign in
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
