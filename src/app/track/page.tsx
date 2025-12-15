"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useTerminology } from "@/lib/terminology";

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface OrgUser {
  id: string;
  full_name: string;
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';

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
  row: {
    display: "flex",
    gap: "12px",
  },
  halfField: {
    flex: 1,
  },
  userList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    maxHeight: "200px",
    overflowY: "auto" as const,
    padding: "12px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
  },
  userItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  userItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  userName: {
    fontSize: "14px",
    color: "#ffffff",
  },
  userEmail: {
    fontSize: "12px",
    color: "#666666",
  },
};

export default function CreateJobPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const terminology = useTerminology();
  
  const [identifier, setIdentifier] = useState("");
  const [stageId, setStageId] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [description, setDescription] = useState("");
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  // Load stages and users
  useEffect(() => {
    const loadData = async () => {
      const orgId = session?.orgId || session?.shopId;
      if (!orgId) return;

      try {
        // Load stages
        const { data: stagesData, error: stagesError } = await supabase
          .from("stages")
          .select("id, name, color")
          .eq("org_id", orgId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (stagesError) throw stagesError;
        setStages((stagesData ?? []).map(s => ({ ...s, color: s.color || '#3b82f6' })));
        
        // Set default stage if available
        if (stagesData && stagesData.length > 0) {
          setStageId(stagesData[0].id);
        }

        // Load org users for assignment
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name")
          .eq("org_id", orgId)
          .eq("is_active", true)
          .order("full_name", { ascending: true });

        if (usersError) throw usersError;
        setOrgUsers(usersData ?? []);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };

    loadData();
  }, [session?.orgId, session?.shopId]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

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
      // Use RPC to create job with assignments
      const { data: result, error: rpcError } = await supabase.rpc('create_job_with_assignments', {
        p_org_id: orgId,
        p_identifier: identifier.trim(),
        p_stage_id: stageId || null,
        p_priority: priority,
        p_due_date: dueDate || null,
        p_estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        p_description: description.trim() || null,
        p_created_by: session?.userId || null,
        p_assigned_user_ids: selectedUserIds.length > 0 ? selectedUserIds : null,
      });

      if (rpcError) throw rpcError;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to create job');
      }

      // Redirect to the new job's detail page
      router.push(`/jobs/${result.job_id}`);
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

          <div style={s.row}>
            <div style={{ ...s.fieldGroup, ...s.halfField }}>
              <label style={s.label}>Initial {terminology.stage}</label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                style={s.select}
              >
                <option value="">No initial {terminology.stage.toLowerCase()}</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...s.fieldGroup, ...s.halfField }}>
              <label style={s.label}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                style={s.select}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={{ ...s.fieldGroup, ...s.halfField }}>
              <label style={s.label}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={s.input}
              />
            </div>

            <div style={{ ...s.fieldGroup, ...s.halfField }}>
              <label style={s.label}>Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                style={s.input}
                placeholder="0.0"
              />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={s.input}
              placeholder="Brief description of the job"
            />
          </div>

          {orgUsers.length > 0 && (
            <div style={s.fieldGroup}>
              <label style={s.label}>Assign Users ({selectedUserIds.length} selected)</label>
              <div style={s.userList}>
                {orgUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    style={{
                      ...s.userItem,
                      ...(selectedUserIds.includes(user.id) ? s.userItemSelected : {}),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      style={s.checkbox}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={s.userName}>{user.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
