"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Vehicle {
  id: string;
  vin_last_8: string;
  current_location_id: string | null;
  current_location_name: string;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  name: string;
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
  backBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#999999",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    textDecoration: "none",
  } as React.CSSProperties,
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "24px",
  },
  filters: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap" as const,
  },
  filterBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#999999",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  filterBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  vehicleItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    marginBottom: "12px",
    border: "1px solid #2a2a2a",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  vehicleInfo: {
    flex: 1,
  },
  vehicleVin: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "4px",
  },
  vehicleLocation: {
    fontSize: "13px",
    color: "#666666",
  },
  vehicleMeta: {
    textAlign: "right" as const,
  },
  vehicleTime: {
    fontSize: "12px",
    color: "#666666",
  },
  locationBadge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  readyBadge: {
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    color: "#eab308",
  },
  completeBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    color: "#22c55e",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
  },
  count: {
    fontSize: "13px",
    color: "#666666",
    marginBottom: "16px",
  },
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function VehiclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(searchParams.get("filter") || "active");

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.shopId) return;

      try {
        // Fetch locations
        const { data: locs } = await supabase
          .from("locations")
          .select("id, name")
          .eq("shop_id", session.shopId)
          .order("sort_order", { ascending: true });

        if (locs) setLocations(locs);

        // Fetch vehicles
        const { data: vehs } = await supabase
          .from("vehicles")
          .select("id, vin_last_8, current_location_id, created_at, updated_at")
          .eq("shop_id", session.shopId)
          .order("updated_at", { ascending: false });

        if (vehs && locs) {
          const locationMap = new Map(locs.map(l => [l.id, l.name]));
          const mapped = vehs.map(v => ({
            ...v,
            current_location_name: locationMap.get(v.current_location_id) || "Unknown",
          }));
          setVehicles(mapped);
        }
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.shopId) fetchData();
  }, [session?.shopId]);

  const completeLocation = locations.find(l => l.name.toLowerCase().includes("complete"));
  const readyLocation = locations.find(l => 
    l.name.toLowerCase().includes("ready") || l.name.toLowerCase().includes("pickup")
  );

  const filteredVehicles = vehicles.filter(v => {
    if (filter === "all") return true;
    if (filter === "active") {
      return !completeLocation || v.current_location_id !== completeLocation.id;
    }
    if (filter === "ready") {
      return readyLocation && v.current_location_id === readyLocation.id;
    }
    if (filter === "complete") {
      return completeLocation && v.current_location_id === completeLocation.id;
    }
    // Filter by specific location
    return v.current_location_id === filter;
  });

  const getBadgeStyle = (locationName: string) => {
    const lower = locationName.toLowerCase();
    if (lower.includes("ready") || lower.includes("pickup")) {
      return { ...s.locationBadge, ...s.readyBadge };
    }
    if (lower.includes("complete")) {
      return { ...s.locationBadge, ...s.completeBadge };
    }
    return s.locationBadge;
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>SHOPFLOWS ADMIN</span>
        <a href="/admin" style={s.backBtn}>← Back to Dashboard</a>
      </header>

      <h1 style={s.title}>Vehicles</h1>
      <p style={s.subtitle}>All vehicles in your shop</p>

      {/* Filters */}
      <div style={s.filters}>
        <button
          style={filter === "active" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("active")}
        >
          Active
        </button>
        <button
          style={filter === "ready" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("ready")}
        >
          Ready for Pickup
        </button>
        <button
          style={filter === "complete" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("complete")}
        >
          Completed
        </button>
        <button
          style={filter === "all" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("all")}
        >
          All
        </button>
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.emptyState}>Loading vehicles...</div>
        ) : filteredVehicles.length === 0 ? (
          <div style={s.emptyState}>
            No vehicles found for this filter.
          </div>
        ) : (
          <>
            <p style={s.count}>{filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""}</p>
            {filteredVehicles.map(vehicle => (
              <div
                key={vehicle.id}
                style={s.vehicleItem}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                }}
              >
                <div style={s.vehicleInfo}>
                  <div style={s.vehicleVin}>{vehicle.vin_last_8}</div>
                  <div style={s.vehicleLocation}>
                    <span style={getBadgeStyle(vehicle.current_location_name)}>
                      {vehicle.current_location_name}
                    </span>
                  </div>
                </div>
                <div style={s.vehicleMeta}>
                  <div style={s.vehicleTime}>
                    Updated {formatTimeAgo(vehicle.updated_at)}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
