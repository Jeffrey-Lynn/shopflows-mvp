"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

const PIN_LENGTH = 4;

const styles = {
  main: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,
  card: {
    width: "100%",
    maxWidth: "360px",
    backgroundColor: "#1a1a1a",
    borderRadius: "24px",
    padding: "40px 32px",
    border: "1px solid #2a2a2a",
  } as React.CSSProperties,
  logo: {
    textAlign: "center" as const,
    marginBottom: "32px",
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
    marginTop: "16px",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
  },
  pinContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  pinDot: (filled: boolean, active: boolean) => ({
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: 600,
    backgroundColor: filled ? "rgba(59, 130, 246, 0.15)" : "#0a0a0a",
    border: filled
      ? "2px solid #3b82f6"
      : active
      ? "2px solid rgba(59, 130, 246, 0.5)"
      : "1px solid #2a2a2a",
    boxShadow: filled
      ? "0 0 30px rgba(59, 130, 246, 0.4)"
      : active
      ? "0 0 20px rgba(59, 130, 246, 0.2)"
      : "none",
    transition: "all 0.15s ease",
  }) as React.CSSProperties,
  error: {
    textAlign: "center" as const,
    color: "#ef4444",
    fontSize: "14px",
    marginBottom: "16px",
  },
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  key: {
    height: "60px",
    borderRadius: "16px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    fontSize: "22px",
    fontWeight: 500,
    color: "#ffffff",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  links: {
    marginTop: "24px",
    textAlign: "center" as const,
    fontSize: "13px",
  },
  link: {
    color: "#3b82f6",
    textDecoration: "none",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { loginDevice } = useAuth();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleDigit = (d: string) => {
    if (verifying) return;
    setError(null);
    setDigits((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = [...prev, d];
      if (next.length === PIN_LENGTH) {
        void verifyPin(next.join(""));
      }
      return next;
    });
  };

  const handleBackspace = () => {
    if (verifying) return;
    setError(null);
    setDigits((prev) => prev.slice(0, -1));
  };

  const verifyPin = async (pin: string) => {
    setVerifying(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("device_login", {
        p_pin: pin,
      });

      if (rpcError) throw rpcError;

      if (data?.success) {
        loginDevice({
          orgId: data.org_id || data.shop_id,
          deviceId: data.device_id,
          deviceName: data.device_name,
          userId: data.user_id,
          name: data.name || data.full_name,
        });
        router.replace("/track");
      } else {
        setError(data?.error || "Invalid PIN");
        setDigits([]);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
      setDigits([]);
    } finally {
      setVerifying(false);
    }
  };

  const placeholders = Array.from({ length: PIN_LENGTH });

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <p style={styles.logoText}>ShopFlows</p>
          <h1 style={styles.title}>Device Login</h1>
          <p style={styles.subtitle}>Enter your 4-digit PIN</p>
        </div>

        <div style={styles.pinContainer}>
          {placeholders.map((_, idx) => {
            const filled = Boolean(digits[idx]);
            const isActive = digits.length === idx;
            return (
              <div key={idx} style={styles.pinDot(filled, isActive)}>
                {filled ? "•" : ""}
              </div>
            );
          })}
        </div>

        {error && <p style={styles.error}>{error}</p>}
        {verifying && (
          <p style={{ ...styles.error, color: "#666666" }}>Verifying...</p>
        )}

        <div style={styles.keypad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
            (label, index) => {
              if (!label) {
                return <div key={index} />;
              }
              const isBackspace = label === "⌫";
              return (
                <button
                  key={index}
                  type="button"
                  disabled={verifying}
                  style={{
                    ...styles.key,
                    opacity: verifying ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!verifying) {
                      e.currentTarget.style.backgroundColor = "#1a1a1a";
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#0a0a0a";
                    e.currentTarget.style.borderColor = "#2a2a2a";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() =>
                    isBackspace ? handleBackspace() : handleDigit(label)
                  }
                >
                  {label}
                </button>
              );
            }
          )}
        </div>

        <div style={styles.links}>
          <p style={{ color: "#666666" }}>
            Shop owner?{" "}
            <a href="/admin/login" style={styles.link}>
              Admin Login
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
