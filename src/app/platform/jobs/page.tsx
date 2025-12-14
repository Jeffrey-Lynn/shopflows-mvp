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
  created_at: string;
  updated_at: string;
}

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
    gridTemplateColumns: "2fr 2fr 1fr 1fr 120px",
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
    gridTemplateColumns: "2fr 2fr 1fr 1fr 120px",
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");

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

        // Fetch all jobs
        const { data: jobsData } = await supabase
          .from("vehicles")
          .select("id, vin, org_id, current_stage_id, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(500);

        const mapped: Job[] = (jobsData ?? []).map(j => ({
          id: j.id,
          vin: j.vin,
          org_id: j.org_id,
          org_name: orgMap.get(j.org_id) || "Unknown",
          current_stage_id: j.current_stage_id,
          created_at: j.created_at,
          updated_at: j.updated_at,
        }));

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
    if (search) {
      const searchLower = search.toLowerCase();
      if (
        !job.vin?.toLowerCase().includes(searchLower) &&
        !job.org_name.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

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
          placeholder="Search by VIN or organization..."
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
              <span>Created</span>
              <span>Updated</span>
              <span>Action</span>
            </div>
            {filteredJobs.map(job => (
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
                <span>{formatDate(job.created_at)}</span>
                <span>{formatDate(job.updated_at)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewJob(job);
                  }}
                  style={s.viewBtn}
                >
                  View Job
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
