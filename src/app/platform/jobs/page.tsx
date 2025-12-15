"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Job {
  id: string;
  vin: string | null;
  org_id: string;
  org_name: string;
  current_stage_id: string | null;
  stage_name: string | null;
  stage_color: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  assigned_users: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#666666', bg: 'rgba(102, 102, 102, 0.15)' },
  medium: { label: 'Med', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  high: { label: 'High', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  urgent: { label: 'Urgent', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#888888",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#ffffff",
    margin: 0,
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
    marginLeft: "8px",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1.5fr 100px",
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
    gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1.5fr 100px",
    gap: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    color: "#999999",
    borderBottom: "1px solid #1a1a1a",
    alignItems: "center",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  } as React.CSSProperties,
  identifier: {
    color: "#ffffff",
    fontWeight: 500,
    fontFamily: "monospace",
  },
  orgBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  viewBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  emptyState: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
  },
  controls: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
  },
  searchInput: {
    flex: 1,
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
  } as React.CSSProperties,
  select: {
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
    cursor: "pointer",
    minWidth: "150px",
  } as React.CSSProperties,
  stageBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#ffffff",
  },
  stageColor: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  priorityBadge: {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 600,
  },
  userAvatars: {
    display: "flex",
    gap: "4px",
  },
  avatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 600,
    color: "#ffffff",
  },
  moreAvatar: {
    backgroundColor: "#2a2a2a",
    color: "#888888",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlatformJobsPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const isPlatformAdmin = session?.role === "platform_admin";

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isPlatformAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isPlatformAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isPlatformAdmin) return;

      try {
        // Fetch all organizations
        const { data: orgsData } = await supabase
          .from("organizations")
          .select("id, name")
          .order("name", { ascending: true });

        setOrgs(orgsData ?? []);

        // Create org name map
        const orgMap = new Map<string, string>();
        (orgsData ?? []).forEach(o => orgMap.set(o.id, o.name));

        // Fetch all stages
        const { data: stagesData } = await supabase
          .from("stages")
          .select("id, name, color")
          .eq("is_active", true);
        
        setStages(stagesData ?? []);
        const stageMap = new Map<string, { name: string; color: string }>();
        (stagesData ?? []).forEach(s => stageMap.set(s.id, { name: s.name, color: s.color || '#3b82f6' }));

        // Fetch all jobs with assignments
        const { data: jobsData } = await supabase
          .from("vehicles")
          .select(`
            id, vin, org_id, current_stage_id, priority, due_date, created_at, updated_at,
            job_assignments ( user_id, users ( id, full_name ) )
          `)
          .order("updated_at", { ascending: false })
          .limit(500);

        const mapped: Job[] = (jobsData ?? []).map(j => {
          const stageInfo = j.current_stage_id ? stageMap.get(j.current_stage_id) : null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const assignments = (j.job_assignments || []) as any[];
          return {
            id: j.id,
            vin: j.vin,
            org_id: j.org_id,
            org_name: orgMap.get(j.org_id) || "Unknown",
            current_stage_id: j.current_stage_id,
            stage_name: stageInfo?.name || null,
            stage_color: stageInfo?.color || '#3b82f6',
            priority: j.priority || 'medium',
            due_date: j.due_date,
            assigned_users: assignments
              .filter(a => a.users)
              .map(a => ({ id: a.users!.id, name: a.users!.full_name })),
            created_at: j.created_at,
            updated_at: j.updated_at,
          };
        });

        setJobs(mapped);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isPlatformAdmin) fetchData();
  }, [isPlatformAdmin]);

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    if (orgFilter && job.org_id !== orgFilter) return false;
    if (stageFilter && job.current_stage_id !== stageFilter) return false;
    if (priorityFilter && job.priority !== priorityFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !job.vin?.toLowerCase().includes(searchLower) &&
        !job.org_name.toLowerCase().includes(searchLower) &&
        !job.stage_name?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleViewJob = (job: Job) => {
    // Switch to that org's context first
    router.push(`/jobs/${job.id}`);
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  if (!isPlatformAdmin) {
    return <div style={s.emptyState}>Access denied. Platform admin only.</div>;
  }

  return (
    <main style={s.page}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button
            style={s.backBtn}
            onClick={() => router.push("/platform")}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#888888";
            }}
          >
            ← Back
          </button>
          <h1 style={s.title}>
            All Jobs
            <span style={s.badge}>PLATFORM</span>
          </h1>
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          style={s.select}
        >
          <option value="">All Organizations</option>
          {orgs.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          style={{ ...s.select, minWidth: "120px" }}
        >
          <option value="">All Stages</option>
          {stages.map(stage => (
            <option key={stage.id} value={stage.id}>{stage.name}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{ ...s.select, minWidth: "120px" }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Jobs Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.emptyState}>Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div style={s.emptyState}>
            {jobs.length === 0 ? "No jobs yet." : "No jobs match your filter."}
          </div>
        ) : (
          <>
            <div style={s.tableHeader}>
              <span>Identifier</span>
              <span>Organization</span>
              <span>Stage</span>
              <span>Priority</span>
              <span>Due Date</span>
              <span>Assigned</span>
              <span>Action</span>
            </div>
            {filteredJobs.map(job => {
              const priorityConfig = PRIORITY_CONFIG[job.priority];
              return (
                <div
                  key={job.id}
                  style={s.tableRow}
                  onClick={() => handleViewJob(job)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#0a0a0a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span style={s.identifier}>{job.vin?.slice(-8) || "N/A"}</span>
                  <span>
                    <span style={s.orgBadge}>{job.org_name}</span>
                  </span>
                  <span>
                    {job.stage_name ? (
                      <span style={s.stageBadge}>
                        <span style={{ ...s.stageColor, backgroundColor: job.stage_color }} />
                        {job.stage_name}
                      </span>
                    ) : (
                      <span style={{ color: '#666666' }}>—</span>
                    )}
                  </span>
                  <span>
                    <span style={{
                      ...s.priorityBadge,
                      backgroundColor: priorityConfig.bg,
                      color: priorityConfig.color,
                    }}>
                      {priorityConfig.label}
                    </span>
                  </span>
                  <span style={{ color: job.due_date ? '#ffffff' : '#666666' }}>
                    {job.due_date ? formatDate(job.due_date) : '—'}
                  </span>
                  <span>
                    {job.assigned_users.length > 0 ? (
                      <div style={s.userAvatars}>
                        {job.assigned_users.slice(0, 3).map(user => (
                          <div key={user.id} style={s.avatar} title={user.name}>
                            {getInitials(user.name)}
                          </div>
                        ))}
                        {job.assigned_users.length > 3 && (
                          <div style={{ ...s.avatar, ...s.moreAvatar }}>
                            +{job.assigned_users.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#666666' }}>—</span>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewJob(job);
                    }}
                    style={s.viewBtn}
                  >
                    View
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
