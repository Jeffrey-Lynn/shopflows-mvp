"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
  success: {
    padding: "12px 16px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    borderRadius: "12px",
    color: "#22c55e",
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!newPassword.trim()) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("reset_password", {
        p_email: email.trim(),
        p_new_password: newPassword,
      });

      if (rpcError) throw rpcError;

      if (data) {
        setSuccess(true);
        setEmail("");
        setNewPassword("");
      } else {
        setError("User not found with that email");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <span style={s.logoText}>ShopFlows</span>
          <h1 style={s.title}>Reset Password</h1>
          <p style={s.subtitle}>Admin password reset tool</p>
        </div>

        <form style={s.form} onSubmit={handleSubmit}>
          {error && <div style={s.error}>{error}</div>}
          {success && (
            <div style={s.success}>
              Password reset successfully! User can now log in with the new password.
            </div>
          )}

          <div style={s.fieldGroup}>
            <label style={s.label}>Email</label>
            <input
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>New Password</label>
            <input
              type="password"
              style={s.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              ...s.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#3b82f6";
            }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div style={s.link}>
          <span
            style={s.linkAnchor}
            onClick={() => router.push("/admin/login")}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = "underline";
              e.currentTarget.style.cursor = "pointer";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Back to Admin Login
          </span>
        </div>
      </div>
    </main>
  );
}
