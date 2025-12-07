"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Vehicle {
  id: string;
  vin_last_8: string;
  shop_name: string;
  location_name: string;
  updated_at: string;
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "1000px",
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
    color: "#ef4444",
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
  searchBox: {
    marginBottom: "20px",
  },
  searchInput: {
    width: "100%",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
  } as React.CSSProperties,
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1.5fr 1.5fr 1fr",
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
    gridTemplateColumns: "1.5fr 1.5fr 1.5fr 1fr",
    gap: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    color: "#999999",
    borderBottom: "1px solid #1a1a1a",
    alignItems: "center",
  },
  vin: {
    color: "#ffffff",
    fontWeight: 500,
    fontFamily: "monospace",
  },
  shopBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  locationBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
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

export default function PlatformVehiclesPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        // Fetch all vehicles
        const { data: vehiclesData } = await supabase
          .from("vehicles")
          .select("id, vin_last_8, shop_id, current_location_id, updated_at")
          .order("updated_at", { ascending: false })
          .limit(500);

        if (!vehiclesData) {
          setLoading(false);
          return;
        }

        // Get unique shop and location IDs
        const shopIds = Array.from(new Set(vehiclesData.map(v => v.shop_id).filter(Boolean)));
        const locationIds = Array.from(new Set(vehiclesData.map(v => v.current_location_id).filter(Boolean)));

        // Fetch shops and locations
        const [shopsRes, locationsRes] = await Promise.all([
          shopIds.length > 0 
            ? supabase.from("shops").select("id, name").in("id", shopIds)
            : Promise.resolve({ data: [] }),
          locationIds.length > 0
            ? supabase.from("locations").select("id, name").in("id", locationIds)
            : Promise.resolve({ data: [] }),
        ]);

        const shopMap = new Map((shopsRes.data || []).map(s => [s.id, s.name]));
        const locationMap = new Map((locationsRes.data || []).map(l => [l.id, l.name]));

        const mapped: Vehicle[] = vehiclesData.map(v => ({
          id: v.id,
          vin_last_8: v.vin_last_8,
          shop_name: shopMap.get(v.shop_id) || "Unknown",
          location_name: locationMap.get(v.current_location_id) || "Unknown",
          updated_at: v.updated_at,
        }));

        setVehicles(mapped);
      } catch (err) {
        console.error("Error fetching vehicles:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isPlatformAdmin) fetchData();
  }, [isPlatformAdmin]);

  const filteredVehicles = vehicles.filter(v => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      v.vin_last_8.toLowerCase().includes(term) ||
      v.shop_name.toLowerCase().includes(term) ||
      v.location_name.toLowerCase().includes(term)
    );
  });

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <span style={s.logo}>SHOPFLOWS PLATFORM</span>
          <span style={s.badge}>GOD MODE</span>
        </div>
        <a href="/platform" style={s.backBtn}>← Back to Platform</a>
      </header>

      <h1 style={s.title}>All Vehicles</h1>
      <p style={s.subtitle}>Every vehicle across all shops</p>

      <div style={s.searchBox}>
        <input
          type="text"
          placeholder="Search VIN, shop, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.emptyState}>Loading vehicles...</div>
        ) : filteredVehicles.length === 0 ? (
          <div style={s.emptyState}>No vehicles found.</div>
        ) : (
          <>
            <p style={s.count}>{filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""}</p>
            <div style={s.tableHeader}>
              <span>VIN</span>
              <span>Shop</span>
              <span>Location</span>
              <span>Updated</span>
            </div>
            {filteredVehicles.map(vehicle => (
              <div key={vehicle.id} style={s.tableRow}>
                <span style={s.vin}>{vehicle.vin_last_8}</span>
                <span><span style={s.shopBadge}>{vehicle.shop_name}</span></span>
                <span><span style={s.locationBadge}>{vehicle.location_name}</span></span>
                <span>{formatTimeAgo(vehicle.updated_at)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </main>
  );
}
