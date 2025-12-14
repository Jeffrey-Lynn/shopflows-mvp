"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface PlatformStats {
  totalOrgs: number;
  totalJobs: number;
  totalUsers: number;
  totalLaborEntries: number;
}

interface Organization {
  id: string;
  name: string;
  owner_email: string | null;
  created_at: string;
  job_count: number;
  user_count: number;
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
    marginBottom: "32px",
    flexWrap: "wrap" as const,
    gap: "12px",
  },
  logo: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.2em",
    color: "#ef4444",
  },
  navLinks: {
    display: "flex",
    gap: "12px",
  },
  navBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#999999",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "32px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
  },
  statValue: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#666666",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 120px",
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
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 120px",
    gap: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    color: "#999999",
    borderBottom: "1px solid #1a1a1a",
    alignItems: "center",
  },
  shopName: {
    color: "#ffffff",
    fontWeight: 500,
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
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlatformPage() {
  const router = useRouter();
  const { session, loading: authLoading, loginAdmin } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Fetch all counts
        const [orgsRes, jobsRes, usersRes, laborRes] = await Promise.all([
          supabase.from("organizations").select("id", { count: "exact", head: true }),
          supabase.from("vehicles").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("labor_entries").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          totalOrgs: orgsRes.count || 0,
          totalJobs: jobsRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalLaborEntries: laborRes.count || 0,
        });

        // Fetch organizations with owner info
        const { data: orgsData } = await supabase
          .from("organizations")
          .select("id, name, created_at, contact_email")
          .order("created_at", { ascending: false });

        if (orgsData) {
          // Get job and user counts per org
          const orgIds = orgsData.map(o => o.id);
          
          const [jobCounts, userCounts] = await Promise.all([
            supabase.from("vehicles").select("org_id").in("org_id", orgIds),
            supabase.from("users").select("org_id").in("org_id", orgIds),
          ]);

          const jobCountMap = new Map<string, number>();
          const userCountMap = new Map<string, number>();

          (jobCounts.data || []).forEach(j => {
            jobCountMap.set(j.org_id, (jobCountMap.get(j.org_id) || 0) + 1);
          });

          (userCounts.data || []).forEach(u => {
            userCountMap.set(u.org_id, (userCountMap.get(u.org_id) || 0) + 1);
          });

          const mapped: Organization[] = orgsData.map(org => ({
            id: org.id,
            name: org.name,
            owner_email: org.contact_email,
            created_at: org.created_at,
            job_count: jobCountMap.get(org.id) || 0,
            user_count: userCountMap.get(org.id) || 0,
          }));

          setOrgs(mapped);
        }
      } catch (err) {
        console.error("Error fetching platform data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isPlatformAdmin) fetchData();
  }, [isPlatformAdmin]);

  const handleViewOrg = (org: Organization) => {
    // Switch context to that organization
    loginAdmin({
      orgId: org.id,
      userId: session?.userId || "",
      email: session?.email || "",
      name: session?.name || "",
      role: "platform_admin", // Keep platform admin role
    });
    router.push("/admin");
  };

  const handleViewAllJobs = () => {
    router.push("/platform/jobs");
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  if (!isPlatformAdmin) {
    return <div style={s.emptyState}>Access denied. Platform admin only.</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <span style={s.logo}>SHOPFLOWS PLATFORM</span>
          <span style={s.badge}>GOD MODE</span>
        </div>
        <div style={s.navLinks}>
          <a href="/platform/vehicles" style={s.navBtn}>All Vehicles</a>
          <a href="/platform/activity" style={s.navBtn}>All Activity</a>
          <a href="/admin/invites" style={s.navBtn}>Invites</a>
        </div>
      </header>

      <h1 style={s.title}>Platform Overview</h1>
      <p style={s.subtitle}>Monitor all shops and activity across the platform</p>

      {/* Stats Grid */}
      {loading ? (
        <div style={s.emptyState}>Loading stats...</div>
      ) : stats && (
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalOrgs}</div>
            <div style={s.statLabel}>Organizations</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalJobs}</div>
            <div style={s.statLabel}>Total Jobs</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalUsers}</div>
            <div style={s.statLabel}>Total Users</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalLaborEntries}</div>
            <div style={s.statLabel}>Labor Entries</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button
            onClick={handleViewAllJobs}
            style={s.viewBtn}
          >
            View All Jobs
          </button>
        </div>
      </div>

      {/* All Organizations */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>All Organizations</h2>
        <div style={s.card}>
          {loading ? (
            <div style={s.emptyState}>Loading organizations...</div>
          ) : orgs.length === 0 ? (
            <div style={s.emptyState}>No organizations yet.</div>
          ) : (
            <>
              <div style={s.tableHeader}>
                <span>Organization</span>
                <span>Contact Email</span>
                <span>Created</span>
                <span>Jobs</span>
                <span>Users</span>
                <span>Action</span>
              </div>
              {orgs.map(org => (
                <div key={org.id} style={s.tableRow}>
                  <span style={s.shopName}>{org.name}</span>
                  <span>{org.owner_email || "—"}</span>
                  <span>{formatDate(org.created_at)}</span>
                  <span>{org.job_count}</span>
                  <span>{org.user_count}</span>
                  <button
                    onClick={() => handleViewOrg(org)}
                    style={s.viewBtn}
                  >
                    View Org
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
