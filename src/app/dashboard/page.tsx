"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface VehicleRow {
  id: string;
  vin_last_8: string;
  current_location_name: string | null;
  updated_at: string;
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
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.shopId) return;
      setLoadingData(true);
      setError(null);
      try {
        const shopId = session.shopId;

        const [{ data: vehicles, error: vehiclesError }, { data: locations, error: locationsError }] =
          await Promise.all([
            supabase
              .from("vehicles")
              .select("id, vin_last_8, current_location_id, updated_at")
              .eq("shop_id", shopId)
              .order("updated_at", { ascending: false }),
            supabase
              .from("locations")
              .select("id, name")
              .eq("shop_id", shopId),
          ] as const);

        if (vehiclesError) throw vehiclesError;
        if (locationsError) throw locationsError;

        const locationMap = new Map<string, string>();
        (locations ?? []).forEach((loc: { id: string; name: string }) => {
          locationMap.set(loc.id, loc.name);
        });

        const mapped: VehicleRow[] = (vehicles ?? []).map(
          (v: { id: string; vin_last_8: string; current_location_id: string | null; updated_at: string }) => ({
            id: v.id,
            vin_last_8: v.vin_last_8,
            current_location_name: v.current_location_id ? locationMap.get(v.current_location_id) ?? null : null,
            updated_at: v.updated_at,
          }),
        );

        setRows(mapped);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard");
      } finally {
        setLoadingData(false);
      }
    };
    void fetchData();
  }, [session?.shopId]);

  const now = new Date();
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
            <h1 style={s.cardTitle}>Active Vehicles</h1>
            <p style={s.cardSubtitle}>Current location and time in stage</p>
          </div>
          <span style={s.badge}>
            {loadingData ? "Loading..." : `${rows.length} vehicle${rows.length === 1 ? "" : "s"}`}
          </span>
        </div>

        <div style={s.list}>
          {loadingData ? (
            <div style={s.loadingState}>Syncing latest movements...</div>
          ) : rows.length === 0 ? (
            <div style={s.emptyState}>
              No vehicles yet. Track a vehicle to see it here.
            </div>
          ) : (
            rows.map((row) => {
              const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
              const duration = updatedAt ? formatDuration(updatedAt, now) : "-";
              return (
                <article
                  key={row.id}
                  style={s.vehicleCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow = "0 0 25px rgba(59, 130, 246, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2a2a2a";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={s.vehicleInfo}>
                    <span style={s.vehicleLabel}>VIN / Job</span>
                    <span style={s.vehicleVin}>{row.vin_last_8}</span>
                    <span style={s.vehicleLocation}>
                      Location:{" "}
                      <span style={s.vehicleLocationValue}>
                        {row.current_location_name ?? "Not set"}
                      </span>
                    </span>
                  </div>
                  <div style={s.vehicleRight}>
                    <span style={s.timeBadge}>{duration} in stage</span>
                    {updatedAt && (
                      <span style={s.timeUpdated}>
                        Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
