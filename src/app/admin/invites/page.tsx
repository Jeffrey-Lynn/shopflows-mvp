"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface InviteToken {
  id: string;
  token: string;
  shop_id: string | null;
  shop_name: string | null;
  used_at: string | null;
  created_at: string;
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    flexWrap: "wrap" as const,
    gap: "12px",
  },
  logo: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.2em",
    color: "#666666",
  },
  backBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#999999",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    textDecoration: "none",
  } as React.CSSProperties,
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "24px",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
    marginBottom: "20px",
  },
  generateBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    marginBottom: "16px",
  } as React.CSSProperties,
  linkBox: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  linkInput: {
    flex: 1,
    height: "48px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 14px",
    fontSize: "13px",
    color: "#ffffff",
    fontFamily: "monospace",
  } as React.CSSProperties,
  copyBtn: {
    height: "48px",
    padding: "0 20px",
    borderRadius: "8px",
    backgroundColor: "#22c55e",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "12px",
    padding: "12px 16px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#666666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    borderBottom: "1px solid #2a2a2a",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "12px",
    padding: "14px 16px",
    fontSize: "13px",
    color: "#999999",
    borderBottom: "1px solid #1a1a1a",
    alignItems: "center",
  },
  tokenText: {
    fontFamily: "monospace",
    color: "#ffffff",
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
  },
  statusUnused: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#22c55e",
  },
  statusUsed: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
  },
  successMsg: {
    fontSize: "13px",
    color: "#22c55e",
    padding: "10px 14px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: "8px",
    marginBottom: "16px",
    textAlign: "center" as const,
  },
};

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function InvitesPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [invites, setInvites] = useState<InviteToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isPlatformAdmin = session?.role === "platform_admin";

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    const fetchInvites = async () => {
      if (!session?.userId) return;

      try {
        let query = supabase
          .from("invite_tokens")
          .select("id, token, shop_id, used_at, created_at")
          .order("created_at", { ascending: false });

        // Platform admins see all, shop admins see only their own
        if (!isPlatformAdmin) {
          query = query.eq("created_by", session.userId);
        }

        const { data: tokens } = await query;

        if (tokens) {
          // Get shop names for used tokens
          const usedShopIds = tokens.filter(t => t.shop_id).map(t => t.shop_id);
          let shopMap = new Map<string, string>();

          if (usedShopIds.length > 0) {
            const { data: shops } = await supabase
              .from("shops")
              .select("id, name")
              .in("id", usedShopIds);
            shopMap = new Map((shops || []).map(s => [s.id, s.name]));
          }

          const mapped: InviteToken[] = tokens.map(t => ({
            ...t,
            shop_name: t.shop_id ? shopMap.get(t.shop_id) || null : null,
          }));

          setInvites(mapped);
        }
      } catch (err) {
        console.error("Error fetching invites:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.userId) fetchInvites();
  }, [session?.userId, isPlatformAdmin]);

  const handleGenerate = async () => {
    if (!session?.userId) return;

    setGenerating(true);
    try {
      const token = generateToken();

      const { error } = await supabase.from("invite_tokens").insert({
        token,
        created_by: session.userId,
      });

      if (error) throw error;

      const fullUrl = `https://shopflows.vercel.app/signup?invite=${token}`;
      setNewLink(fullUrl);

      // Add to list
      setInvites(prev => [{
        id: crypto.randomUUID(),
        token,
        shop_id: null,
        shop_name: null,
        used_at: null,
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch (err) {
      console.error("Error generating invite:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!newLink) return;
    try {
      await navigator.clipboard.writeText(newLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>SHOPFLOWS ADMIN</span>
        <a href="/admin" style={s.backBtn}>← Back to Dashboard</a>
      </header>

      <h1 style={s.title}>Invite Links</h1>
      <p style={s.subtitle}>Generate invite links for new shops to sign up</p>

      {/* Generate Section */}
      <div style={s.card}>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            ...s.generateBtn,
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? "Generating..." : "Generate New Invite Link"}
        </button>

        {newLink && (
          <>
            {copied && <div style={s.successMsg}>Copied to clipboard!</div>}
            <div style={s.linkBox}>
              <input
                type="text"
                readOnly
                value={newLink}
                style={s.linkInput}
              />
              <button onClick={handleCopy} style={s.copyBtn}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Invites Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.emptyState}>Loading invites...</div>
        ) : invites.length === 0 ? (
          <div style={s.emptyState}>No invite links generated yet.</div>
        ) : (
          <>
            <div style={s.tableHeader}>
              <span>Token</span>
              <span>Status</span>
              <span>Created</span>
              <span>Used</span>
            </div>
            {invites.map(invite => (
              <div key={invite.id} style={s.tableRow}>
                <span style={s.tokenText}>{invite.token.slice(0, 8)}...</span>
                <span>
                  {invite.used_at ? (
                    <span style={{ ...s.statusBadge, ...s.statusUsed }}>
                      Used{invite.shop_name ? ` by ${invite.shop_name}` : ""}
                    </span>
                  ) : (
                    <span style={{ ...s.statusBadge, ...s.statusUnused }}>
                      Unused
                    </span>
                  )}
                </span>
                <span>{formatDate(invite.created_at)}</span>
                <span>{invite.used_at ? formatDate(invite.used_at) : "—"}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
