"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalUsers: number;
  totalDepartments: number;
  activeJobs: number;
  pendingTasks: number;
}

// Icons
const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DepartmentsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  welcomeSection: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
  },
  orgBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "8px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    color: "#3b82f6",
    fontSize: "13px",
    fontWeight: 500,
    marginTop: "12px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
    transition: "all 0.15s ease",
  },
  statHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "14px",
    color: "#666666",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  actionCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
    textDecoration: "none",
    display: "block",
    transition: "all 0.15s ease",
    cursor: "pointer",
  } as React.CSSProperties,
  actionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "12px",
  },
  actionIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
  },
  actionDesc: {
    fontSize: "13px",
    color: "#666666",
    marginBottom: "16px",
  },
  actionLink: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: 500,
  },
  loading: {
    textAlign: "center" as const,
    padding: "60px 20px",
    color: "#666666",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #2a2a2a",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    margin: "0 auto 16px",
  },
};

export default function AdminDashboard() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPlatformAdmin = session?.role === "platform_admin";

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    console.log('[AdminDashboard] useEffect triggered, session.orgId:', session?.orgId);
    console.log('[AdminDashboard] Full session:', session);
    const fetchData = async () => {
      if (!session?.orgId) {
        console.log('[AdminDashboard] No orgId in session, skipping fetch');
        setLoading(false);
        return;
      }

      console.log('[AdminDashboard] Fetching data for orgId:', session.orgId);
      try {
        // Fetch org name
        const { data: orgData } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", session.orgId)
          .single();

        if (orgData) {
          setOrgName(orgData.name);
        }

        // Fetch user count for this org
        const { count: userCount } = await supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("org_id", session.orgId);

        // Fetch department count for this org
        const { count: deptCount } = await supabase
          .from("departments")
          .select("id", { count: "exact", head: true })
          .eq("org_id", session.orgId);

        setStats({
          totalUsers: userCount || 0,
          totalDepartments: deptCount || 0,
          activeJobs: 0, // Placeholder
          pendingTasks: 0, // Placeholder
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.orgId) {
      fetchData();
    }
  }, [session?.orgId]);

  const handleSettingsClick = () => {
    alert("Settings feature coming soon!");
  };

  if (authLoading || !session?.isAuthenticated) {
    return (
      <div style={s.loading}>
        <div style={s.spinner} className="admin-spinner" />
        <p>Loading...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes admin-spin { to { transform: rotate(360deg); } }
          .admin-spinner { animation: admin-spin 1s linear infinite; }
        ` }} />
      </div>
    );
  }

  return (
    <main style={s.page}>
      {/* Welcome Section */}
      <div style={s.welcomeSection}>
        <h1 style={s.title}>
          Welcome back{session.name ? `, ${session.name}` : ""}!
        </h1>
        <p style={s.subtitle}>
          Here&apos;s what&apos;s happening in your shop today
        </p>
        {orgName && (
          <div style={s.orgBadge}>
            <DepartmentsIcon />
            {orgName}
          </div>
        )}
      </div>

      {loading ? (
        <div style={s.loading}>
          <div style={s.spinner} className="admin-spinner" />
          <p>Loading dashboard...</p>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes admin-spin { to { transform: rotate(360deg); } }
            .admin-spinner { animation: admin-spin 1s linear infinite; }
          ` }} />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={s.statsGrid}>
            {/* Total Users */}
            <div style={s.statCard}>
              <div style={s.statHeader}>
                <div style={{ ...s.statIcon, backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                  <UsersIcon />
                </div>
              </div>
              <div style={s.statValue}>{stats?.totalUsers || 0}</div>
              <div style={s.statLabel}>Total Users</div>
            </div>

            {/* Total Departments */}
            <div style={s.statCard}>
              <div style={s.statHeader}>
                <div style={{ ...s.statIcon, backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                  <DepartmentsIcon />
                </div>
              </div>
              <div style={s.statValue}>{stats?.totalDepartments || 0}</div>
              <div style={s.statLabel}>Total Departments</div>
            </div>

            {/* Active Jobs */}
            <div style={s.statCard}>
              <div style={s.statHeader}>
                <div style={{ ...s.statIcon, backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
                  <BriefcaseIcon />
                </div>
              </div>
              <div style={s.statValue}>{stats?.activeJobs || 0}</div>
              <div style={s.statLabel}>Active Jobs</div>
            </div>

            {/* Pending Tasks */}
            <div style={s.statCard}>
              <div style={s.statHeader}>
                <div style={{ ...s.statIcon, backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                  <ClipboardIcon />
                </div>
              </div>
              <div style={s.statValue}>{stats?.pendingTasks || 0}</div>
              <div style={s.statLabel}>Pending Tasks</div>
            </div>
          </div>

          {/* Quick Actions */}
          <h2 style={s.sectionTitle}>Quick Actions</h2>
          <div style={s.actionsGrid}>
            {/* Manage Users */}
            <Link
              href="/admin/users"
              style={s.actionCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={s.actionHeader}>
                <div style={{ ...s.actionIcon, backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                  <UsersIcon />
                </div>
                <span style={s.actionTitle}>Manage Users</span>
              </div>
              <p style={s.actionDesc}>Add, edit, or remove users from your organization</p>
              <div style={{ ...s.actionLink, color: "#3b82f6" }}>
                View Users <ArrowRightIcon />
              </div>
            </Link>

            {/* Manage Departments */}
            <Link
              href="/admin/departments"
              style={s.actionCard}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#10b981";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={s.actionHeader}>
                <div style={{ ...s.actionIcon, backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                  <DepartmentsIcon />
                </div>
                <span style={s.actionTitle}>Manage Departments</span>
              </div>
              <p style={s.actionDesc}>Create and organize departments for your shop</p>
              <div style={{ ...s.actionLink, color: "#10b981" }}>
                View Departments <ArrowRightIcon />
              </div>
            </Link>

            {/* View Activity - Platform Admin Only */}
            {isPlatformAdmin && (
              <Link
                href="/platform/activity"
                style={s.actionCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#f59e0b";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={s.actionHeader}>
                  <div style={{ ...s.actionIcon, backgroundColor: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" }}>
                    <ActivityIcon />
                  </div>
                  <span style={s.actionTitle}>View Activity</span>
                </div>
                <p style={s.actionDesc}>Monitor platform-wide activity and events</p>
                <div style={{ ...s.actionLink, color: "#f59e0b" }}>
                  View Activity <ArrowRightIcon />
                </div>
              </Link>
            )}

            {/* Settings */}
            <div
              style={s.actionCard}
              onClick={handleSettingsClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#8b5cf6";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={s.actionHeader}>
                <div style={{ ...s.actionIcon, backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
                  <SettingsIcon />
                </div>
                <span style={s.actionTitle}>Settings</span>
              </div>
              <p style={s.actionDesc}>Configure your organization settings and preferences</p>
              <div style={{ ...s.actionLink, color: "#8b5cf6" }}>
                Open Settings <ArrowRightIcon />
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
