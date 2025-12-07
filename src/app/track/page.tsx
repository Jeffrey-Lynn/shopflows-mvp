"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Location {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  vin_last_8: string;
  current_location_id: string | null;
  current_location_name: string;
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
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
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
    padding: "24px",
    border: "1px solid #2a2a2a",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "4px",
  },
  cardSubtitle: {
    fontSize: "13px",
    color: "#666666",
    marginBottom: "24px",
  },
  form: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  label: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: "#666666",
    textTransform: "uppercase" as const,
  },
  input: {
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "16px",
    fontWeight: 500,
    color: "#ffffff",
    outline: "none",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  select: {
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "15px",
    color: "#ffffff",
    outline: "none",
    appearance: "none" as const,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  error: {
    fontSize: "14px",
    color: "#ef4444",
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(239, 68, 68, 0.2)",
  },
  offline: {
    fontSize: "14px",
    color: "#f59e0b",
    padding: "12px 16px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(245, 158, 11, 0.2)",
  },
  btnGroup: {
    marginTop: "auto",
    paddingTop: "24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  primaryBtn: {
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#3b82f6",
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)",
  } as React.CSSProperties,
  secondaryBtn: {
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "transparent",
    fontSize: "14px",
    fontWeight: 500,
    color: "#666666",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  modeToggle: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  modeBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 500,
    border: "1px solid #2a2a2a",
    backgroundColor: "#0a0a0a",
    color: "#666666",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  modeBtnActive: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "#3b82f6",
    color: "#3b82f6",
  },
  successMsg: {
    fontSize: "14px",
    color: "#22c55e",
    padding: "12px 16px",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderRadius: "12px",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    textAlign: "center" as const,
  },
  combobox: {
    position: "relative" as const,
  },
  comboboxInput: {
    width: "100%",
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "15px",
    color: "#ffffff",
    outline: "none",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  comboboxDropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    marginTop: "4px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    maxHeight: "240px",
    overflowY: "auto" as const,
    zIndex: 100,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
  },
  comboboxItem: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#ffffff",
    cursor: "pointer",
    borderBottom: "1px solid #2a2a2a",
    transition: "background-color 0.1s ease",
  } as React.CSSProperties,
  comboboxItemLocation: {
    fontSize: "12px",
    color: "#666666",
    marginTop: "2px",
  },
  comboboxEmpty: {
    padding: "16px",
    fontSize: "13px",
    color: "#666666",
    textAlign: "center" as const,
  },
  comboboxSelected: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "56px",
    borderRadius: "12px",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid #3b82f6",
    padding: "0 16px",
    cursor: "pointer",
  },
  comboboxSelectedText: {
    fontSize: "15px",
    color: "#ffffff",
    fontWeight: 500,
  },
  comboboxSelectedLocation: {
    fontSize: "12px",
    color: "#3b82f6",
  },
  comboboxClear: {
    padding: "4px 8px",
    borderRadius: "6px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "none",
    color: "#ef4444",
    fontSize: "12px",
    cursor: "pointer",
  } as React.CSSProperties,
};

export default function TrackPage() {
  const router = useRouter();
  const { session, loading, logout } = useAuth();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [vin, setVin] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [fromLocationId, setFromLocationId] = useState<string | "">("");
  const [toLocationId, setToLocationId] = useState<string | "">("");
  
  // Searchable combobox state
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!session?.shopId) return;
      try {
        // Load locations
        const { data: locs, error: locError } = await supabase
          .from("locations")
          .select("id, name")
          .eq("shop_id", session.shopId)
          .order("sort_order", { ascending: true });
        if (locError) throw locError;
        setLocations(locs ?? []);

        // Find "Complete" location to filter out archived vehicles
        const completeLocation = locs?.find(l => 
          l.name.toLowerCase().includes("complete")
        );

        // Load active vehicles (not in Complete)
        let vehicleQuery = supabase
          .from("vehicles")
          .select("id, vin_last_8, current_location_id")
          .eq("shop_id", session.shopId)
          .order("updated_at", { ascending: false });

        if (completeLocation) {
          vehicleQuery = vehicleQuery.neq("current_location_id", completeLocation.id);
        }

        const { data: vehs, error: vehError } = await vehicleQuery;
        if (vehError) throw vehError;

        // Map location names
        const locationMap = new Map(locs?.map(l => [l.id, l.name]) || []);
        const mappedVehicles: Vehicle[] = (vehs || []).map(v => ({
          ...v,
          current_location_name: locationMap.get(v.current_location_id) || "Unknown",
        }));
        setVehicles(mappedVehicles);

        setOffline(false);
      } catch (err) {
        console.error(err);
        setOffline(true);
      }
    };
    void loadData();
  }, [session?.shopId]);

  // Handle selecting an existing vehicle
  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setVin(vehicle.vin_last_8);
      setFromLocationId(vehicle.current_location_id || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.shopId) return;
    
    const effectiveVin = mode === "existing" && selectedVehicleId 
      ? vehicles.find(v => v.id === selectedVehicleId)?.vin_last_8 || vin
      : vin;
    
    if (!effectiveVin || !toLocationId) {
      setError("Vehicle and destination are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const vinLast8 = effectiveVin.trim().slice(-8);
      let vehicleId = mode === "existing" ? selectedVehicleId : undefined;

      if (!vehicleId) {
        // Check if vehicle exists
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .select("id, current_location_id")
          .eq("shop_id", session.shopId)
          .eq("vin_last_8", vinLast8)
          .maybeSingle();

        if (vehicleError && vehicleError.code !== "PGRST116") {
          throw vehicleError;
        }

        vehicleId = vehicle?.id;

        if (!vehicleId) {
          // Create new vehicle
          const { data: newVehicle, error: insertError } = await supabase
            .from("vehicles")
            .insert({
              shop_id: session.shopId,
              vin_last_8: vinLast8,
              current_location_id: toLocationId || null,
            })
            .select("id")
            .single();
          if (insertError) throw insertError;
          vehicleId = newVehicle.id;
        } else {
          // Update existing vehicle location
          const { error: updateError } = await supabase
            .from("vehicles")
            .update({ current_location_id: toLocationId || null, updated_at: new Date().toISOString() })
            .eq("id", vehicleId);
          if (updateError) throw updateError;
        }
      } else {
        // Update selected vehicle location
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({ current_location_id: toLocationId || null, updated_at: new Date().toISOString() })
          .eq("id", vehicleId);
        if (updateError) throw updateError;
      }

      // Record movement with device_id
      const { error: movementError } = await supabase.from("vehicle_movements").insert({
        shop_id: session.shopId,
        vehicle_id: vehicleId,
        from_location_id: fromLocationId || null,
        to_location_id: toLocationId || null,
        device_id: session.deviceId || null,
      });
      if (movementError) throw movementError;

      // Update local vehicles list
      const locationName = locations.find(l => l.id === toLocationId)?.name || "Unknown";
      setVehicles(prev => {
        const updated = prev.map(v => 
          v.id === vehicleId 
            ? { ...v, current_location_id: toLocationId, current_location_name: locationName }
            : v
        );
        // If new vehicle, add it
        if (!prev.find(v => v.id === vehicleId)) {
          updated.unshift({
            id: vehicleId!,
            vin_last_8: vinLast8,
            current_location_id: toLocationId,
            current_location_name: locationName,
          });
        }
        return updated;
      });

      setSuccess(`${vinLast8} moved to ${locationName}`);
      setVin("");
      setSelectedVehicleId("");
      setFromLocationId("");
      setToLocationId("");
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to log movement. Check connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = () => {
    logout();
    router.replace("/login");
  };

  const isAdmin = session?.role === "shop_admin" || session?.role === "platform_admin";

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logo}>
            {session?.deviceName ? `SHOPFLOWS • ${session.deviceName}` : "SHOPFLOWS"}
          </span>
        </div>
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
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      </header>

      {offline && (
        <div style={s.offline}>
          No connection — please reconnect to log movements.
        </div>
      )}

      <section style={s.card}>
        <h1 style={s.cardTitle}>Track Vehicle</h1>
        <p style={s.cardSubtitle}>Log vehicle movement between locations</p>

        {/* Mode Toggle */}
        <div style={s.modeToggle}>
          <button
            type="button"
            style={mode === "new" ? { ...s.modeBtn, ...s.modeBtnActive } : s.modeBtn}
            onClick={() => {
              setMode("new");
              setSelectedVehicleId("");
              setFromLocationId("");
            }}
          >
            New Vehicle
          </button>
          <button
            type="button"
            style={mode === "existing" ? { ...s.modeBtn, ...s.modeBtnActive } : s.modeBtn}
            onClick={() => setMode("existing")}
          >
            Existing ({vehicles.length})
          </button>
        </div>

        {success && <div style={s.successMsg}>{success}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          {mode === "existing" ? (
            <div style={s.fieldGroup}>
              <label style={s.label}>Select Vehicle</label>
              <div style={s.combobox}>
                {selectedVehicleId ? (
                  // Show selected vehicle
                  (() => {
                    const selected = vehicles.find(v => v.id === selectedVehicleId);
                    return (
                      <div 
                        style={s.comboboxSelected}
                        onClick={() => {
                          setSelectedVehicleId("");
                          setVehicleSearch("");
                          setFromLocationId("");
                          setShowVehicleDropdown(true);
                        }}
                      >
                        <div>
                          <div style={s.comboboxSelectedText}>{selected?.vin_last_8}</div>
                          <div style={s.comboboxSelectedLocation}>Currently: {selected?.current_location_name}</div>
                        </div>
                        <button
                          type="button"
                          style={s.comboboxClear}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVehicleId("");
                            setVehicleSearch("");
                            setFromLocationId("");
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    );
                  })()
                ) : (
                  // Show search input
                  <input
                    type="text"
                    value={vehicleSearch}
                    onChange={(e) => {
                      setVehicleSearch(e.target.value.toUpperCase());
                      setShowVehicleDropdown(true);
                    }}
                    onFocus={() => setShowVehicleDropdown(true)}
                    placeholder="Type VIN to search or click to browse..."
                    style={{
                      ...s.comboboxInput,
                      borderColor: showVehicleDropdown ? "#3b82f6" : "#2a2a2a",
                      boxShadow: showVehicleDropdown ? "0 0 20px rgba(59, 130, 246, 0.3)" : "none",
                    }}
                  />
                )}
                
                {/* Dropdown */}
                {showVehicleDropdown && !selectedVehicleId && (
                  <div style={s.comboboxDropdown}>
                    {(() => {
                      const filtered = vehicles.filter(v => 
                        v.vin_last_8.toLowerCase().includes(vehicleSearch.toLowerCase())
                      );
                      
                      if (filtered.length === 0) {
                        return (
                          <div style={s.comboboxEmpty}>
                            {vehicleSearch ? `No vehicles matching "${vehicleSearch}"` : "No active vehicles"}
                          </div>
                        );
                      }
                      
                      return filtered.slice(0, 20).map((v, idx) => (
                        <div
                          key={v.id}
                          style={{
                            ...s.comboboxItem,
                            borderBottom: idx === filtered.slice(0, 20).length - 1 ? "none" : "1px solid #2a2a2a",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                          onClick={() => {
                            handleVehicleSelect(v.id);
                            setVehicleSearch("");
                            setShowVehicleDropdown(false);
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{v.vin_last_8}</div>
                          <div style={s.comboboxItemLocation}>Currently: {v.current_location_name}</div>
                        </div>
                      ));
                    })()}
                    {vehicles.filter(v => v.vin_last_8.toLowerCase().includes(vehicleSearch.toLowerCase())).length > 20 && (
                      <div style={s.comboboxEmpty}>
                        Type to narrow results ({vehicles.filter(v => v.vin_last_8.toLowerCase().includes(vehicleSearch.toLowerCase())).length} total)
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Click outside to close */}
              {showVehicleDropdown && (
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99,
                  }}
                  onClick={() => setShowVehicleDropdown(false)}
                />
              )}
            </div>
          ) : (
            <div style={s.fieldGroup}>
              <label style={s.label}>VIN / Job # (last 8)</label>
              <input
                type="text"
                inputMode="text"
                autoFocus
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                style={s.input}
                placeholder="Enter VIN or job number"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#2a2a2a";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          )}

          <div style={s.fieldGroup}>
            <label style={s.label}>
              From Location {mode === "existing" && selectedVehicleId ? "(current)" : "(optional)"}
            </label>
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              disabled={mode === "existing" && !!selectedVehicleId}
              style={{
                ...s.select,
                opacity: mode === "existing" && selectedVehicleId ? 0.6 : 1,
                cursor: mode === "existing" && selectedVehicleId ? "not-allowed" : "pointer",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">Select origin</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label}>To Location</label>
            <select
              required
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              style={s.select}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.3)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="">Select destination</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {error && <div style={s.error}>{error}</div>}

          <div style={s.btnGroup}>
            <button
              type="submit"
              disabled={submitting || offline}
              style={{
                ...s.primaryBtn,
                opacity: submitting || offline ? 0.5 : 1,
                cursor: submitting || offline ? "not-allowed" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (!submitting && !offline) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(59, 130, 246, 0.6)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 30px rgba(59, 130, 246, 0.4)";
              }}
            >
              {submitting ? "Logging..." : "Log Movement"}
            </button>

            <button
              type="button"
              style={s.secondaryBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#444444";
                e.currentTarget.style.color = "#999999";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#666666";
              }}
              onClick={handleLock}
            >
              Lock Device
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
