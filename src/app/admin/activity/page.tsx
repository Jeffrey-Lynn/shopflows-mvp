"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Movement {
  id: string;
  vehicle_id: string;
  vin_last_8: string;
  from_location_name: string | null;
  to_location_name: string;
  moved_at: string;
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
  movementItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    marginBottom: "12px",
    border: "1px solid #2a2a2a",
  },
  movementInfo: {
    flex: 1,
  },
  movementVin: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "6px",
  },
  movementFlow: {
    fontSize: "13px",
    color: "#666666",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  arrow: {
    color: "#3b82f6",
  },
  locationTag: {
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    color: "#3b82f6",
    fontSize: "12px",
  },
  movementMeta: {
    textAlign: "right" as const,
    minWidth: "120px",
  },
  movementTime: {
    fontSize: "13px",
    color: "#ffffff",
    marginBottom: "4px",
  },
  movementDate: {
    fontSize: "12px",
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

export default function ActivityPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"today" | "week" | "all">("today");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.shopId) return;
      setLoading(true);

      try {
        // Get date filter
        let dateFilter = new Date();
        if (filter === "today") {
          dateFilter.setHours(0, 0, 0, 0);
        } else if (filter === "week") {
          dateFilter.setDate(dateFilter.getDate() - 7);
        } else {
          dateFilter = new Date(0); // All time
        }

        // Fetch movements
        const { data: movs } = await supabase
          .from("vehicle_movements")
          .select("id, vehicle_id, from_location_id, to_location_id, moved_at")
          .eq("shop_id", session.shopId)
          .gte("moved_at", dateFilter.toISOString())
          .order("moved_at", { ascending: false })
          .limit(limit);

        if (!movs || movs.length === 0) {
          setMovements([]);
          setLoading(false);
          return;
        }

        // Get unique IDs
        const vehicleIds = Array.from(new Set(movs.map(m => m.vehicle_id)));
        const locationIds = Array.from(new Set([
          ...movs.map(m => m.from_location_id).filter(Boolean),
          ...movs.map(m => m.to_location_id).filter(Boolean),
        ]));

        // Fetch related data
        const [vehiclesRes, locationsRes] = await Promise.all([
          supabase.from("vehicles").select("id, vin_last_8").in("id", vehicleIds),
          locationIds.length > 0
            ? supabase.from("locations").select("id, name").in("id", locationIds)
            : Promise.resolve({ data: [] }),
        ]);

        const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.id, v.vin_last_8]));
        const locationMap = new Map((locationsRes.data || []).map(l => [l.id, l.name]));

        const mapped: Movement[] = movs.map(m => ({
          id: m.id,
          vehicle_id: m.vehicle_id,
          vin_last_8: vehicleMap.get(m.vehicle_id) || "Unknown",
          from_location_name: m.from_location_id ? locationMap.get(m.from_location_id) || null : null,
          to_location_name: locationMap.get(m.to_location_id) || "Unknown",
          moved_at: m.moved_at,
        }));

        setMovements(mapped);
      } catch (err) {
        console.error("Error fetching activity:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.shopId) fetchData();
  }, [session?.shopId, filter, limit]);

  const filteredMovements = movements.filter(m => {
    if (!search) return true;
    return m.vin_last_8.toLowerCase().includes(search.toLowerCase());
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString();
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

      <h1 style={s.title}>Activity Log</h1>
      <p style={s.subtitle}>Vehicle movement history</p>

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
          placeholder="Search VIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
      </div>

      <div style={s.card}>
        {loading ? (
          <div style={s.emptyState}>Loading activity...</div>
        ) : filteredMovements.length === 0 ? (
          <div style={s.emptyState}>
            No movements found for this period.
          </div>
        ) : (
          <>
            <p style={s.count}>{filteredMovements.length} movement{filteredMovements.length !== 1 ? "s" : ""}</p>
            {filteredMovements.map(movement => (
              <div key={movement.id} style={s.movementItem}>
                <div style={s.movementInfo}>
                  <div style={s.movementVin}>{movement.vin_last_8}</div>
                  <div style={s.movementFlow}>
                    {movement.from_location_name ? (
                      <>
                        <span style={s.locationTag}>{movement.from_location_name}</span>
                        <span style={s.arrow}>→</span>
                      </>
                    ) : (
                      <span style={{ color: "#666666" }}>New →</span>
                    )}
                    <span style={s.locationTag}>{movement.to_location_name}</span>
                  </div>
                </div>
                <div style={s.movementMeta}>
                  <div style={s.movementTime}>{formatTime(movement.moved_at)}</div>
                  <div style={s.movementDate}>{formatDate(movement.moved_at)}</div>
                </div>
              </div>
            ))}
            {movements.length >= limit && (
              <button
                style={s.loadMore}
                onClick={() => setLimit(l => l + 50)}
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
