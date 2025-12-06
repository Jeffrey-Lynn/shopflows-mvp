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

interface Movement {
  id: string;
  from_location_name: string | null;
  to_location_name: string;
  moved_at: string;
  device_name: string | null;
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
  expandedContent: {
    overflow: "hidden",
    transition: "max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease",
  },
  historySection: {
    borderTop: "1px solid #2a2a2a",
    paddingTop: "16px",
    marginTop: "16px",
  },
  historyTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#666666",
    marginBottom: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },
  historyItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 0",
    fontSize: "13px",
    color: "#999999",
    borderBottom: "1px solid #1a1a1a",
  },
  historyArrow: {
    color: "#3b82f6",
  },
  historyTime: {
    marginLeft: "auto",
    fontSize: "11px",
    color: "#666666",
  },
  moveSection: {
    borderTop: "1px solid #2a2a2a",
    paddingTop: "16px",
    marginTop: "16px",
  },
  moveTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#666666",
    marginBottom: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  },
  moveForm: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-end",
    flexWrap: "wrap" as const,
  },
  moveField: {
    flex: 1,
    minWidth: "150px",
  },
  moveLabel: {
    fontSize: "11px",
    color: "#666666",
    marginBottom: "6px",
    display: "block",
  },
  moveSelect: {
    width: "100%",
    height: "44px",
    borderRadius: "8px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    padding: "0 12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
  } as React.CSSProperties,
  moveBtn: {
    height: "44px",
    padding: "0 20px",
    borderRadius: "8px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  collapseBtn: {
    marginTop: "16px",
    padding: "8px 16px",
    borderRadius: "6px",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    color: "#666666",
    fontSize: "12px",
    cursor: "pointer",
    width: "100%",
  } as React.CSSProperties,
  successMsg: {
    fontSize: "13px",
    color: "#22c55e",
    padding: "8px 12px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: "6px",
    marginTop: "12px",
    textAlign: "center" as const,
  },
  tapHint: {
    fontSize: "11px",
    color: "#444444",
    marginTop: "4px",
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
  
  // Expansion state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Move form state
  const [moveDestination, setMoveDestination] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null);

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

  // Load history when card is expanded
  const handleExpand = async (vehicleId: string) => {
    if (expandedId === vehicleId) {
      setExpandedId(null);
      setHistory([]);
      setMoveDestination("");
      setMoveSuccess(null);
      return;
    }

    setExpandedId(vehicleId);
    setHistoryLoading(true);
    setMoveDestination("");
    setMoveSuccess(null);

    try {
      // Fetch movement history
      const { data: movements } = await supabase
        .from("vehicle_movements")
        .select("id, from_location_id, to_location_id, moved_at, device_id")
        .eq("vehicle_id", vehicleId)
        .order("moved_at", { ascending: false })
        .limit(10);

      if (movements && movements.length > 0) {
        // Get device names
        const deviceIds = Array.from(new Set(movements.map(m => m.device_id).filter(Boolean)));
        let deviceMap = new Map<string, string>();
        
        if (deviceIds.length > 0) {
          const { data: devices } = await supabase
            .from("devices")
            .select("id, device_name")
            .in("id", deviceIds);
          deviceMap = new Map((devices || []).map(d => [d.id, d.device_name]));
        }

        // Map location names
        const locationMap = new Map(locations.map(l => [l.id, l.name]));

        const mapped: Movement[] = movements.map(m => ({
          id: m.id,
          from_location_name: m.from_location_id ? locationMap.get(m.from_location_id) || null : null,
          to_location_name: locationMap.get(m.to_location_id) || "Unknown",
          moved_at: m.moved_at,
          device_name: m.device_id ? deviceMap.get(m.device_id) || null : null,
        }));

        setHistory(mapped);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle inline move
  const handleMove = async (vehicle: Vehicle) => {
    if (!moveDestination || !session?.shopId) return;

    setMoving(true);
    setMoveSuccess(null);

    try {
      // Update vehicle location
      const { error: updateError } = await supabase
        .from("vehicles")
        .update({ 
          current_location_id: moveDestination, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", vehicle.id);

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase
        .from("vehicle_movements")
        .insert({
          shop_id: session.shopId,
          vehicle_id: vehicle.id,
          from_location_id: vehicle.current_location_id,
          to_location_id: moveDestination,
          device_id: session.deviceId || null,
        });

      if (movementError) throw movementError;

      // Update local state
      const newLocationName = locations.find(l => l.id === moveDestination)?.name || "Unknown";
      setVehicles(prev => prev.map(v => 
        v.id === vehicle.id 
          ? { ...v, current_location_id: moveDestination, current_location_name: newLocationName, updated_at: new Date().toISOString() }
          : v
      ));

      // Add to history
      setHistory(prev => [{
        id: crypto.randomUUID(),
        from_location_name: vehicle.current_location_name,
        to_location_name: newLocationName,
        moved_at: new Date().toISOString(),
        device_name: session.deviceName || null,
      }, ...prev.slice(0, 9)]);

      setMoveSuccess(`Moved to ${newLocationName}`);
      setMoveDestination("");

      // Clear success after 3 seconds
      setTimeout(() => setMoveSuccess(null), 3000);
    } catch (err) {
      console.error("Error moving vehicle:", err);
    } finally {
      setMoving(false);
    }
  };

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
            {filteredVehicles.map(vehicle => {
              const isExpanded = expandedId === vehicle.id;
              return (
                <div
                  key={vehicle.id}
                  style={{
                    ...s.vehicleItem,
                    flexDirection: "column",
                    alignItems: "stretch",
                    cursor: "pointer",
                    borderColor: isExpanded ? "#3b82f6" : "#2a2a2a",
                  }}
                  onClick={() => handleExpand(vehicle.id)}
                >
                  {/* Main row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={s.vehicleInfo}>
                      <div style={s.vehicleVin}>{vehicle.vin_last_8}</div>
                      <div style={s.vehicleLocation}>
                        <span style={getBadgeStyle(vehicle.current_location_name)}>
                          {vehicle.current_location_name}
                        </span>
                      </div>
                      {!isExpanded && <div style={s.tapHint}>Tap to expand</div>}
                    </div>
                    <div style={s.vehicleMeta}>
                      <div style={s.vehicleTime}>
                        Updated {formatTimeAgo(vehicle.updated_at)}
                      </div>
                      <div style={{ fontSize: "16px", color: "#666666", marginTop: "4px" }}>
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  <div
                    style={{
                      ...s.expandedContent,
                      maxHeight: isExpanded ? "500px" : "0px",
                      opacity: isExpanded ? 1 : 0,
                      padding: isExpanded ? "0" : "0",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isExpanded && (
                      <>
                        {/* Movement History */}
                        <div style={s.historySection}>
                          <div style={s.historyTitle}>Movement History</div>
                          {historyLoading ? (
                            <div style={{ color: "#666666", fontSize: "13px" }}>Loading...</div>
                          ) : history.length === 0 ? (
                            <div style={{ color: "#666666", fontSize: "13px" }}>No movement history</div>
                          ) : (
                            history.map((mov, idx) => (
                              <div key={mov.id} style={{
                                ...s.historyItem,
                                borderBottom: idx === history.length - 1 ? "none" : "1px solid #1a1a1a",
                              }}>
                                <span>{mov.from_location_name || "New"}</span>
                                <span style={s.historyArrow}>→</span>
                                <span>{mov.to_location_name}</span>
                                {mov.device_name && (
                                  <span style={{ color: "#666666", fontSize: "11px" }}>
                                    ({mov.device_name})
                                  </span>
                                )}
                                <span style={s.historyTime}>{formatTimeAgo(mov.moved_at)}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Quick Move Form */}
                        <div style={s.moveSection}>
                          <div style={s.moveTitle}>Move Vehicle</div>
                          <div style={s.moveForm}>
                            <div style={s.moveField}>
                              <label style={s.moveLabel}>From (current)</label>
                              <select
                                disabled
                                value={vehicle.current_location_id || ""}
                                style={{ ...s.moveSelect, opacity: 0.6, cursor: "not-allowed" }}
                              >
                                <option>{vehicle.current_location_name}</option>
                              </select>
                            </div>
                            <div style={s.moveField}>
                              <label style={s.moveLabel}>To (destination)</label>
                              <select
                                value={moveDestination}
                                onChange={(e) => setMoveDestination(e.target.value)}
                                style={s.moveSelect}
                              >
                                <option value="">Select destination...</option>
                                {locations
                                  .filter(l => l.id !== vehicle.current_location_id)
                                  .map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                  ))
                                }
                              </select>
                            </div>
                            <button
                              type="button"
                              disabled={!moveDestination || moving}
                              onClick={() => handleMove(vehicle)}
                              style={{
                                ...s.moveBtn,
                                opacity: !moveDestination || moving ? 0.5 : 1,
                                cursor: !moveDestination || moving ? "not-allowed" : "pointer",
                              }}
                            >
                              {moving ? "Moving..." : "Move"}
                            </button>
                          </div>
                          {moveSuccess && <div style={s.successMsg}>{moveSuccess}</div>}
                        </div>

                        {/* Collapse button */}
                        <button
                          type="button"
                          style={s.collapseBtn}
                          onClick={() => handleExpand(vehicle.id)}
                        >
                          Collapse
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </main>
  );
}
