"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useTerminology } from "@/lib/terminology";

interface Stage {
  id: string;
  name: string;
}

const s = {
  page: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logo: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.2em",
    color: "#666666",
  },
  navBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#999999",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  card: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    backgroundColor: "#1a1a1a",
    borderRadius: "20px",
    padding: "24px",
    border: "1px solid #2a2a2a",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "4px",
  },
  cardSubtitle: {
    fontSize: "13px",
    color: "#666666",
    marginBottom: "24px",
  },
  form: {
    flex: 1,
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
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: "#666666",
    textTransform: "uppercase" as const,
  },
  input: {
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "16px",
    fontWeight: 500,
    color: "#ffffff",
    outline: "none",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  select: {
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "15px",
    color: "#ffffff",
    outline: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  error: {
    fontSize: "14px",
    color: "#ef4444",
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  btnGroup: {
    marginTop: "auto",
    paddingTop: "24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  primaryBtn: {
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#3b82f6",
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)",
  } as React.CSSProperties,
  secondaryBtn: {
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "transparent",
    fontSize: "14px",
    fontWeight: 500,
    color: "#666666",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  successMsg: {
    fontSize: "14px",
    color: "#22c55e",
    padding: "12px 16px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    textAlign: "center" as const,
  },
};

export default function CreateJobPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const terminology = useTerminology();
  
  const [identifier, setIdentifier] = useState("");
  const [stageId, setStageId] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  // Load stages
  useEffect(() => {
    const loadStages = async () => {
      const orgId = session?.orgId || session?.shopId;
      if (!orgId) return;

      try {
        const { data, error: stagesError } = await supabase
          .from("stages")
          .select("id, name")
          .eq("org_id", orgId)
          .order("sort_order", { ascending: true });

        if (stagesError) throw stagesError;
        setStages(data ?? []);
        
        // Set default stage if available
        if (data && data.length > 0) {
          setStageId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load stages:", err);
      }
    };

    loadStages();
  }, [session?.orgId, session?.shopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orgId = session?.orgId || session?.shopId;
    if (!orgId) return;

    if (!identifier.trim()) {
      setError(`${terminology.identifier} is required`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create new job (vehicle in current schema)
      const { data: newJob, error: insertError } = await supabase
        .from("vehicles")
        .insert({
          org_id: orgId,
          vin: identifier.trim(),
          current_stage_id: stageId || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Redirect to the new job's detail page
      router.push(`/jobs/${newJob.id}`);
    } catch (err) {
      console.error("Failed to create job:", err);
      setError(`Failed to create ${terminology.item.toLowerCase()}. Please try again.`);
      setSubmitting(false);
    }
  };

  const isAdmin = session?.role === "shop_admin" || session?.role === "platform_admin";

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>
            {session?.deviceName ? `SHOPFLOWS • ${session.deviceName}` : "SHOPFLOWS"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {isAdmin && (
            <button
              type="button"
              style={s.navBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#999999";
              }}
              onClick={() => router.push("/admin")}
            >
              Admin
            </button>
          )}
          <button
            type="button"
            style={s.navBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#999999";
            }}
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      </header>

      <section style={s.card}>
        <h1 style={s.cardTitle}>Create New {terminology.item}</h1>
        <p style={s.cardSubtitle}>
          Add a new {terminology.item.toLowerCase()} to start tracking
        </p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label}>{terminology.identifier}</label>
            <input
              type="text"
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
              style={s.input}
              placeholder={`Enter ${terminology.identifier.toLowerCase()}`}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Initial {terminology.stage}</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              style={s.select}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">No initial {terminology.stage.toLowerCase()}</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.btnGroup}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...s.primaryBtn,
                opacity: submitting ? 0.5 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(59, 130, 246, 0.6)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(59, 130, 246, 0.4)";
              }}
            >
              {submitting ? "Creating..." : `Create ${terminology.item}`}
            </button>

            <button
              type="button"
              style={s.secondaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#444444";
                e.currentTarget.style.color = "#999999";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#666666";
              }}
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
