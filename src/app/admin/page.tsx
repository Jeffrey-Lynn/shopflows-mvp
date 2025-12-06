"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Stats {
  total_vehicles: number;
  active_devices: number;
  total_movements: number;
  recent_movements_24h: number;
}

interface RecentMovement {
  id: string;
  vin_last_8: string;
  location_name: string;
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
  nav: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
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
    transition: "all 0.15s ease",
    textDecoration: "none",
  } as React.CSSProperties,
  navBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    color: "#ffffff",
  },
  title: {
    fontSize: "28px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "24px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  statValue: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#666666",
  },
  section: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
  },
  activityItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #2a2a2a",
  },
  activityVin: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
  },
  activityLocation: {
    fontSize: "13px",
    color: "#666666",
  },
  activityTime: {
    fontSize: "12px",
    color: "#666666",
  },
  quickLinks: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  quickLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    textDecoration: "none",
    color: "#ffffff",
    transition: "all 0.15s ease",
    cursor: "pointer",
  } as React.CSSProperties,
  quickLinkIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  },
  quickLinkText: {
    fontSize: "14px",
    fontWeight: 500,
  },
  loading: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
  },
};

export default function AdminDashboard() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.shopId) return;

      try {
        // Fetch stats
        const { data: statsData } = await supabase.rpc("get_shop_stats", {
          p_shop_id: session.shopId,
        });
        if (statsData) setStats(statsData);

        // Fetch recent activity
        const { data: movements } = await supabase
          .from("vehicle_movements")
          .select(`
            id,
            created_at,
            vehicles!inner(vin_last_8),
            locations!vehicle_movements_to_location_id_fkey(name)
          `)
          .eq("shop_id", session.shopId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (movements) {
          const formatted = movements.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            vin_last_8: (m.vehicles as Record<string, unknown>)?.vin_last_8 as string || "Unknown",
            location_name: (m.locations as Record<string, unknown>)?.name as string || "Unknown",
            created_at: m.created_at as string,
          }));
          setRecentActivity(formatted);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.shopId) {
      fetchData();
    }
  }, [session?.shopId]);

  const handleLogout = () => {
    logout();
    router.replace("/admin/login");
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.loading}>Loading...</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>SHOPFLOWS ADMIN</span>
        <nav style={s.nav}>
          <a href="/admin" style={{ ...s.navBtn, ...s.navBtnActive }}>
            Dashboard
          </a>
          <a href="/admin/locations" style={s.navBtn}>
            Locations
          </a>
          <a href="/admin/devices" style={s.navBtn}>
            Devices
          </a>
          <button
            onClick={handleLogout}
            style={{ ...s.navBtn, color: "#ef4444", borderColor: "#ef4444" }}
          >
            Logout
          </button>
        </nav>
      </header>

      <h1 style={s.title}>Dashboard</h1>
      <p style={s.subtitle}>
        Welcome back{session.name ? `, ${session.name}` : ""}
      </p>

      {loading ? (
        <div style={s.loading}>Loading stats...</div>
      ) : (
        <>
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statValue}>{stats?.total_vehicles || 0}</div>
              <div style={s.statLabel}>Total Vehicles</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>{stats?.active_devices || 0}</div>
              <div style={s.statLabel}>Active Devices</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>{stats?.recent_movements_24h || 0}</div>
              <div style={s.statLabel}>Movements (24h)</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>{stats?.total_movements || 0}</div>
              <div style={s.statLabel}>Total Movements</div>
            </div>
          </div>

          <div style={s.section}>
            <h2 style={s.sectionTitle}>Quick Actions</h2>
            <div style={s.quickLinks}>
              <a
                href="/admin/locations"
                style={s.quickLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.quickLinkIcon}>📍</div>
                <span style={s.quickLinkText}>Manage Locations</span>
              </a>
              <a
                href="/admin/devices"
                style={s.quickLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.quickLinkIcon}>📱</div>
                <span style={s.quickLinkText}>Manage Devices</span>
              </a>
              <a
                href="/dashboard"
                style={s.quickLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.quickLinkIcon}>🚗</div>
                <span style={s.quickLinkText}>View Vehicles</span>
              </a>
              <a
                href="/track"
                style={s.quickLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.quickLinkIcon}>➕</div>
                <span style={s.quickLinkText}>Track Vehicle</span>
              </a>
            </div>
          </div>

          <div style={s.section}>
            <h2 style={s.sectionTitle}>Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <p style={{ color: "#666666", fontSize: "14px" }}>
                No recent activity. Start tracking vehicles to see updates here.
              </p>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  style={{
                    ...s.activityItem,
                    borderBottom:
                      index === recentActivity.length - 1
                        ? "none"
                        : "1px solid #2a2a2a",
                  }}
                >
                  <div>
                    <div style={s.activityVin}>{activity.vin_last_8}</div>
                    <div style={s.activityLocation}>
                      Moved to {activity.location_name}
                    </div>
                  </div>
                  <div style={s.activityTime}>
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </main>
  );
}
