"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { JobItemCard } from "@/modules/jobs/components/JobItemCard";
import { useTerminology } from "@/lib/terminology";
import { FeatureGate } from "@/components/FeatureGate";

// Display-ready job item (mapped from database)
interface JobItemDisplay {
  id: string;
  identifier: string;
  currentStageName: string | null;
  updatedAt: string;
}

function formatDuration(from: Date, to: Date) {
  const diffMs = to.getTime() - from.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
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
    padding: "20px",
    border: "1px solid #2a2a2a",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "2px",
  },
  cardSubtitle: {
    fontSize: "12px",
    color: "#666666",
  },
  badge: {
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: "#0a0a0a",
    fontSize: "12px",
    color: "#666666",
  },
  list: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    overflowY: "auto" as const,
  },
  vehicleCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    border: "1px solid #2a2a2a",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  vehicleInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  vehicleLabel: {
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "0.15em",
    color: "#666666",
    textTransform: "uppercase" as const,
  },
  vehicleVin: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
  },
  vehicleLocation: {
    fontSize: "13px",
    color: "#666666",
  },
  vehicleLocationValue: {
    color: "#999999",
    fontWeight: 500,
  },
  vehicleRight: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-end",
    gap: "4px",
  },
  timeBadge: {
    padding: "6px 12px",
    borderRadius: "20px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    fontSize: "12px",
    fontWeight: 500,
    color: "#3b82f6",
  },
  timeUpdated: {
    fontSize: "11px",
    color: "#666666",
  },
  emptyState: {
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "#666666",
    fontSize: "14px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    border: "1px dashed #2a2a2a",
  },
  loadingState: {
    padding: "20px",
    textAlign: "center" as const,
    color: "#666666",
    fontSize: "14px",
  },
  error: {
    fontSize: "14px",
    color: "#ef4444",
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading, logout } = useAuth();
  const terminology = useTerminology();
  const [items, setItems] = useState<JobItemDisplay[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    const fetchData = async () => {
      const orgId = session?.orgId || session?.shopId;
      if (!orgId) return;

      setLoadingData(true);
      setError(null);

      try {
        const { data: vehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("id, vin, current_stage_id, updated_at")
          .eq("org_id", orgId)
          .order("updated_at", { ascending: false });

        if (vehiclesError) {
          setError("Failed to load dashboard: " + vehiclesError.message);
          return;
        }

        type VehicleRow = {
          id: string;
          vin: string | null;
          current_stage_id: string | null;
          updated_at: string;
        };

        const mapped: JobItemDisplay[] = (vehicles ?? []).map((v: VehicleRow) => ({
          id: v.id,
          identifier: v.vin?.slice(-8) || "N/A",
          currentStageName: "In Progress",
          updatedAt: v.updated_at,
        }));

        console.log('Mapped items:', mapped);
        setItems(mapped);
      } catch (err) {
        console.error("Dashboard error:", err);
        setError("Failed to load dashboard");
      } finally {
        setLoadingData(false);
      }
    };
    void fetchData();
  }, [session?.orgId, session?.shopId]);

  const isAdmin = session?.role === "shop_admin" || session?.role === "platform_admin";

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <main style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>
          {session?.deviceName ? `SHOPFLOWS • ${session.deviceName}` : "SHOPFLOWS"}
        </span>
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
            onClick={() => router.push("/track")}
          >
            + Track
          </button>
          <button
            type="button"
            style={{ ...s.navBtn, color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {error && <div style={s.error}>{error}</div>}

      <section style={s.card}>
        <div style={s.cardHeader}>
          <div>
            <h1 style={s.cardTitle}>Active {terminology.itemPlural}</h1>
            <p style={s.cardSubtitle}>Current {terminology.stage.toLowerCase()} and time in {terminology.stage.toLowerCase()}</p>
          </div>
          <span style={s.badge}>
            {loadingData ? "Loading..." : `${items.length} ${items.length === 1 ? terminology.item.toLowerCase() : terminology.itemPlural.toLowerCase()}`}
          </span>
        </div>

        <div style={s.list}>
          {loadingData ? (
            <div style={s.loadingState}>Syncing latest movements...</div>
          ) : items.length === 0 ? (
            <div style={s.emptyState}>
              No {terminology.itemPlural.toLowerCase()} yet. Track {terminology.item.toLowerCase() === "item" ? "an" : "a"} {terminology.item.toLowerCase()} to see it here.
            </div>
          ) : (
            items.map((item) => (
              <JobItemCard
                key={item.id}
                id={item.id}
                identifier={item.identifier}
                currentStageName={item.currentStageName}
                updatedAt={item.updatedAt}
              />
            ))
          )}
        </div>
      </section>

      {/* Feature Gate Examples - Testing the feature flags system */}
      <FeatureGate feature="labor_tracking">
        <section style={{ ...s.card, flex: "none", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>⏱️</span>
            <div>
              <h3 style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600, margin: 0 }}>Labor Tracking</h3>
              <p style={{ color: "#666666", fontSize: "12px", margin: 0 }}>Track worker hours and assignments (enabled by default)</p>
            </div>
          </div>
        </section>
      </FeatureGate>

      <FeatureGate 
        feature="inventory" 
        fallback={
          <section style={{ ...s.card, flex: "none", padding: "16px", borderColor: "#3b3b00" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>📦</span>
              <div>
                <h3 style={{ color: "#fbbf24", fontSize: "14px", fontWeight: 600, margin: 0 }}>Inventory Module</h3>
                <p style={{ color: "#666666", fontSize: "12px", margin: 0 }}>Upgrade to Professional plan to enable inventory tracking</p>
              </div>
            </div>
          </section>
        }
      >
        <section style={{ ...s.card, flex: "none", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "20px" }}>📦</span>
            <div>
              <h3 style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600, margin: 0 }}>Inventory Module</h3>
              <p style={{ color: "#666666", fontSize: "12px", margin: 0 }}>Full inventory tracking is enabled</p>
            </div>
          </div>
        </section>
      </FeatureGate>
    </main>
  );
}