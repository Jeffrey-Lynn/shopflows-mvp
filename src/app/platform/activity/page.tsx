"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Movement {
  id: string;
  vin_last_8: string;
  shop_name: string;
  from_location: string | null;
  to_location: string;
  device_name: string | null;
  moved_at: string;
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "1100px",
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
  searchInput: {
    flex: 1,
    minWidth: "200px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 14px",
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
    gridTemplateColumns: "1fr 1.2fr 2fr 1fr 1fr",
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
    gridTemplateColumns: "1fr 1.2fr 2fr 1fr 1fr",
    gap: "12px",
    padding: "14px 16px",
    fontSize: "13px",
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
    fontSize: "11px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  flow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "12px",
  },
  arrow: {
    color: "#3b82f6",
  },
  locationTag: {
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    color: "#22c55e",
    fontSize: "11px",
  },
  deviceTag: {
    fontSize: "11px",
    color: "#666666",
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
  loadMore: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    color: "#999999",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "12px",
  } as React.CSSProperties,
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PlatformActivityPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"today" | "week" | "all">("today");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);

  const isPlatformAdmin = session?.role === "platform_admin";

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isPlatformAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isPlatformAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isPlatformAdmin) return;
      setLoading(true);

      try {
        // Get date filter
        let dateFilter = new Date();
        if (filter === "today") {
          dateFilter.setHours(0, 0, 0, 0);
        } else if (filter === "week") {
          dateFilter.setDate(dateFilter.getDate() - 7);
        } else {
          dateFilter = new Date(0);
        }

        // Fetch movements
        const { data: movementsData } = await supabase
          .from("vehicle_movements")
          .select("id, vehicle_id, shop_id, from_location_id, to_location_id, device_id, moved_at")
          .gte("moved_at", dateFilter.toISOString())
          .order("moved_at", { ascending: false })
          .limit(limit);

        if (!movementsData || movementsData.length === 0) {
          setMovements([]);
          setLoading(false);
          return;
        }

        // Get unique IDs
        const vehicleIds = Array.from(new Set(movementsData.map(m => m.vehicle_id).filter(Boolean)));
        const shopIds = Array.from(new Set(movementsData.map(m => m.shop_id).filter(Boolean)));
        const locationIds = Array.from(new Set([
          ...movementsData.map(m => m.from_location_id).filter(Boolean),
          ...movementsData.map(m => m.to_location_id).filter(Boolean),
        ]));
        const deviceIds = Array.from(new Set(movementsData.map(m => m.device_id).filter(Boolean)));

        // Fetch related data
        const [vehiclesRes, shopsRes, locationsRes, devicesRes] = await Promise.all([
          vehicleIds.length > 0 
            ? supabase.from("vehicles").select("id, vin_last_8").in("id", vehicleIds)
            : Promise.resolve({ data: [] }),
          shopIds.length > 0
            ? supabase.from("shops").select("id, name").in("id", shopIds)
            : Promise.resolve({ data: [] }),
          locationIds.length > 0
            ? supabase.from("locations").select("id, name").in("id", locationIds)
            : Promise.resolve({ data: [] }),
          deviceIds.length > 0
            ? supabase.from("devices").select("id, device_name").in("id", deviceIds)
            : Promise.resolve({ data: [] }),
        ]);

        const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.id, v.vin_last_8]));
        const shopMap = new Map((shopsRes.data || []).map(s => [s.id, s.name]));
        const locationMap = new Map((locationsRes.data || []).map(l => [l.id, l.name]));
        const deviceMap = new Map((devicesRes.data || []).map(d => [d.id, d.device_name]));

        const mapped: Movement[] = movementsData.map(m => ({
          id: m.id,
          vin_last_8: vehicleMap.get(m.vehicle_id) || "Unknown",
          shop_name: shopMap.get(m.shop_id) || "Unknown",
          from_location: m.from_location_id ? locationMap.get(m.from_location_id) || null : null,
          to_location: locationMap.get(m.to_location_id) || "Unknown",
          device_name: m.device_id ? deviceMap.get(m.device_id) || null : null,
          moved_at: m.moved_at,
        }));

        setMovements(mapped);
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isPlatformAdmin) fetchData();
  }, [isPlatformAdmin, filter, limit]);

  const filteredMovements = movements.filter(m => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      m.vin_last_8.toLowerCase().includes(term) ||
      m.shop_name.toLowerCase().includes(term) ||
      m.to_location.toLowerCase().includes(term) ||
      (m.from_location && m.from_location.toLowerCase().includes(term))
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

      <h1 style={s.title}>All Activity</h1>
      <p style={s.subtitle}>Every movement across all shops</p>

      {/* Filters */}
      <div style={s.filters}>
        <button
          style={filter === "today" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("today")}
        >
          Today
        </button>
        <button
          style={filter === "week" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("week")}
        >
          This Week
        </button>
        <button
          style={filter === "all" ? { ...s.filterBtn, ...s.filterBtnActive } : s.filterBtn}
          onClick={() => setFilter("all")}
        >
          All Time
        </button>
        <input
          type="text"
          placeholder="Search VIN, shop, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.emptyState}>Loading activity...</div>
        ) : filteredMovements.length === 0 ? (
          <div style={s.emptyState}>No movements found.</div>
        ) : (
          <>
            <p style={s.count}>{filteredMovements.length} movement{filteredMovements.length !== 1 ? "s" : ""}</p>
            <div style={s.tableHeader}>
              <span>VIN</span>
              <span>Shop</span>
              <span>Movement</span>
              <span>Device</span>
              <span>Time</span>
            </div>
            {filteredMovements.map(movement => (
              <div key={movement.id} style={s.tableRow}>
                <span style={s.vin}>{movement.vin_last_8}</span>
                <span><span style={s.shopBadge}>{movement.shop_name}</span></span>
                <div style={s.flow}>
                  {movement.from_location ? (
                    <>
                      <span style={s.locationTag}>{movement.from_location}</span>
                      <span style={s.arrow}>→</span>
                    </>
                  ) : (
                    <span style={{ color: "#666666" }}>New →</span>
                  )}
                  <span style={s.locationTag}>{movement.to_location}</span>
                </div>
                <span style={s.deviceTag}>{movement.device_name || "—"}</span>
                <span>
                  {formatTime(movement.moved_at)}<br />
                  <span style={{ fontSize: "11px", color: "#666666" }}>{formatDate(movement.moved_at)}</span>
                </span>
              </div>
            ))}
            {movements.length >= limit && (
              <button
                style={s.loadMore}
                onClick={() => setLimit(l => l + 100)}
              >
                Load More
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
