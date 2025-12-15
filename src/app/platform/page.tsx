"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  totalDepartments: number;
  recentActivity: number;
}

interface Organization {
  id: string;
  name: string;
  owner_email: string | null;
  created_at: string;
  job_count: number;
  user_count: number;
}

// Icons
const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M16 14h.01" />
  </svg>
);

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

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
        const [orgsRes, usersRes, deptsRes] = await Promise.all([
          supabase.from("organizations").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("departments").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          totalOrgs: orgsRes.count || 0,
          totalUsers: usersRes.count || 0,
          totalDepartments: deptsRes.count || 0,
          recentActivity: 0, // Placeholder for now
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

  const userName = session?.name || session?.email?.split('@')[0] || 'Admin';

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

      {/* Welcome Message */}
      <div style={{
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
      }}>
        <h1 style={{ ...s.title, marginBottom: '4px', fontSize: '24px' }}>
          Welcome back, {userName}! 👋
        </h1>
        <p style={{ ...s.subtitle, marginBottom: 0 }}>
          Here&apos;s what&apos;s happening across your platform today.
        </p>
      </div>

      <h2 style={{ ...s.title, fontSize: '20px' }}>Platform Overview</h2>
      <p style={s.subtitle}>Monitor all shops and activity across the platform</p>

      {/* Stats Grid */}
      {loading ? (
        <div style={s.emptyState}>Loading stats...</div>
      ) : stats && (
        <div style={s.statsGrid}>
          <div style={{...s.statCard, borderLeft: '3px solid #3b82f6'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: '#3b82f6' }}><BuildingIcon /></div>
              <div style={s.statLabel}>Organizations</div>
            </div>
            <div style={s.statValue}>{stats.totalOrgs}</div>
          </div>
          <div style={{...s.statCard, borderLeft: '3px solid #10b981'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: '#10b981' }}><UsersIcon /></div>
              <div style={s.statLabel}>Total Users</div>
            </div>
            <div style={s.statValue}>{stats.totalUsers}</div>
          </div>
          <div style={{...s.statCard, borderLeft: '3px solid #f59e0b'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: '#f59e0b' }}><DepartmentsIcon /></div>
              <div style={s.statLabel}>Departments</div>
            </div>
            <div style={s.statValue}>{stats.totalDepartments}</div>
          </div>
          <div style={{...s.statCard, borderLeft: '3px solid #8b5cf6'}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: '#8b5cf6' }}><ActivityIcon /></div>
              <div style={s.statLabel}>Recent Activity</div>
            </div>
            <div style={s.statValue}>{stats.recentActivity}</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Quick Actions</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}>
          <Link href="/platform/organizations" style={{ textDecoration: 'none' }}>
            <div style={{
              ...s.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#3b82f6' }}><BuildingIcon /></div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '15px' }}>View All Organizations</div>
                  <div style={{ color: '#666666', fontSize: '13px' }}>Manage shops and tenants</div>
                </div>
              </div>
              <div style={{ color: '#666666' }}><ArrowRightIcon /></div>
            </div>
          </Link>

          <Link href="/platform/activity" style={{ textDecoration: 'none' }}>
            <div style={{
              ...s.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#8b5cf6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#8b5cf6' }}><ActivityIcon /></div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '15px' }}>View Activity</div>
                  <div style={{ color: '#666666', fontSize: '13px' }}>Platform-wide activity log</div>
                </div>
              </div>
              <div style={{ color: '#666666' }}><ArrowRightIcon /></div>
            </div>
          </Link>

          <Link href="/admin/users" style={{ textDecoration: 'none' }}>
            <div style={{
              ...s.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#10b981' }}><UsersIcon /></div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '15px' }}>Manage Users</div>
                  <div style={{ color: '#666666', fontSize: '13px' }}>Add and edit users</div>
                </div>
              </div>
              <div style={{ color: '#666666' }}><ArrowRightIcon /></div>
            </div>
          </Link>

          <Link href="/admin/departments" style={{ textDecoration: 'none' }}>
            <div style={{
              ...s.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: '#f59e0b' }}><DepartmentsIcon /></div>
                <div>
                  <div style={{ color: '#ffffff', fontWeight: 500, fontSize: '15px' }}>Manage Departments</div>
                  <div style={{ color: '#666666', fontSize: '13px' }}>Configure departments</div>
                </div>
              </div>
              <div style={{ color: '#666666' }}><ArrowRightIcon /></div>
            </div>
          </Link>
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
