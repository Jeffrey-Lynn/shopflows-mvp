"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface KPIs {
  activeVehicles: number;
  readyForPickup: number;
  movementsToday: number;
  avgCompletionTime: string;
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
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
    marginBottom: "32px",
  },
  kpiCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties,
  kpiCardHighlight: {
    borderColor: "rgba(234, 179, 8, 0.3)",
    backgroundColor: "rgba(234, 179, 8, 0.05)",
  },
  kpiValue: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },
  kpiValueHighlight: {
    color: "#eab308",
  },
  kpiLabel: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "8px",
  },
  kpiHint: {
    fontSize: "11px",
    color: "#444444",
    marginTop: "8px",
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

function formatDuration(hours: number): string {
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 1.5) return "1 day";
  return `${days.toFixed(1)} days`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin, logout } = useAuth();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    const fetchKPIs = async () => {
      if (!session?.shopId) return;

      try {
        // Get all locations to find "Complete" and "Ready for Pickup" IDs
        const { data: locations } = await supabase
          .from("locations")
          .select("id, name")
          .eq("shop_id", session.shopId);

        const completeLocation = locations?.find(l => 
          l.name.toLowerCase().includes("complete")
        );
        const readyLocation = locations?.find(l => 
          l.name.toLowerCase().includes("ready") || l.name.toLowerCase().includes("pickup")
        );

        // Get all vehicles with their current locations
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, current_location_id")
          .eq("shop_id", session.shopId);

        // Calculate active vehicles (not in Complete)
        const activeVehicles = vehicles?.filter(v => 
          !completeLocation || v.current_location_id !== completeLocation.id
        ).length || 0;

        // Calculate ready for pickup
        const readyForPickup = readyLocation 
          ? vehicles?.filter(v => v.current_location_id === readyLocation.id).length || 0
          : 0;

        // Get movements in last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        
        const { count: movementsToday, error: movError } = await supabase
          .from("vehicle_movements")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", session.shopId)
          .gte("created_at", yesterday.toISOString());

        // Debug: log if there's an error or unexpected result
        if (movError) {
          console.error("Movements query error:", movError);
        }
        console.log("Movements today query:", { shopId: session.shopId, since: yesterday.toISOString(), count: movementsToday });

        // Calculate average completion time
        // Get vehicles that have reached "Complete" status
        let avgCompletionTime = "—";
        if (completeLocation) {
          const { data: completedMovements } = await supabase
            .from("vehicle_movements")
            .select("vehicle_id, created_at")
            .eq("shop_id", session.shopId)
            .eq("to_location_id", completeLocation.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (completedMovements && completedMovements.length > 0) {
            const vehicleIds = Array.from(new Set(completedMovements.map(m => m.vehicle_id)));
            
            // Get first movement for each completed vehicle
            const { data: firstMovements } = await supabase
              .from("vehicle_movements")
              .select("vehicle_id, created_at")
              .eq("shop_id", session.shopId)
              .in("vehicle_id", vehicleIds)
              .order("created_at", { ascending: true });

            if (firstMovements) {
              const firstMoveMap = new Map<string, string>();
              firstMovements.forEach(m => {
                if (!firstMoveMap.has(m.vehicle_id)) {
                  firstMoveMap.set(m.vehicle_id, m.created_at);
                }
              });

              let totalHours = 0;
              let count = 0;
              completedMovements.forEach(cm => {
                const firstMove = firstMoveMap.get(cm.vehicle_id);
                if (firstMove) {
                  const start = new Date(firstMove).getTime();
                  const end = new Date(cm.created_at).getTime();
                  const hours = (end - start) / (1000 * 60 * 60);
                  if (hours > 0) {
                    totalHours += hours;
                    count++;
                  }
                }
              });

              if (count > 0) {
                avgCompletionTime = formatDuration(totalHours / count);
              }
            }
          }
        }

        setKpis({
          activeVehicles,
          readyForPickup,
          movementsToday: movementsToday || 0,
          avgCompletionTime,
        });
      } catch (err) {
        console.error("Error fetching KPIs:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.shopId) {
      fetchKPIs();
    }
  }, [session?.shopId]);

  const handleLogout = () => {
    logout();
    router.replace("/admin/login");
  };

  const handleKpiClick = (path: string) => {
    router.push(path);
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
        <div style={s.loading}>Loading KPIs...</div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div style={s.kpiGrid}>
            {/* Active Vehicles */}
            <div
              style={s.kpiCard}
              onClick={() => handleKpiClick("/admin/vehicles")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(59, 130, 246, 0.2)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={s.kpiValue}>{kpis?.activeVehicles || 0}</div>
              <div style={s.kpiLabel}>Active Vehicles</div>
              <div style={s.kpiHint}>Tap to view all vehicles →</div>
            </div>

            {/* Ready for Pickup - Highlighted */}
            <div
              style={{ ...s.kpiCard, ...s.kpiCardHighlight }}
              onClick={() => handleKpiClick("/admin/vehicles?filter=ready")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#eab308";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(234, 179, 8, 0.3)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(234, 179, 8, 0.3)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={{ ...s.kpiValue, ...s.kpiValueHighlight }}>
                {kpis?.readyForPickup || 0}
              </div>
              <div style={s.kpiLabel}>Ready for Pickup</div>
              <div style={s.kpiHint}>Customers waiting →</div>
            </div>

            {/* Movements Today */}
            <div
              style={s.kpiCard}
              onClick={() => handleKpiClick("/admin/activity")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(59, 130, 246, 0.2)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={s.kpiValue}>{kpis?.movementsToday || 0}</div>
              <div style={s.kpiLabel}>Movements Today</div>
              <div style={s.kpiHint}>Tap to view activity →</div>
            </div>

            {/* Avg Completion Time */}
            <div
              style={s.kpiCard}
              onClick={() => handleKpiClick("/admin/analytics")}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(59, 130, 246, 0.2)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div style={s.kpiValue}>{kpis?.avgCompletionTime || "—"}</div>
              <div style={s.kpiLabel}>Avg Completion Time</div>
              <div style={s.kpiHint}>Tap to view trends →</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={s.section}>
            <h2 style={s.sectionTitle}>Quick Actions</h2>
            <div style={s.quickLinks}>
              <a
                href="/admin/vehicles"
                style={s.quickLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.quickLinkIcon}>🚗</div>
                <span style={s.quickLinkText}>All Vehicles</span>
              </a>
              <a
                href="/admin/activity"
                style={s.quickLink}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.quickLinkIcon}>📋</div>
                <span style={s.quickLinkText}>Activity Log</span>
              </a>
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
        </>
      )}
    </main>
  );
}
