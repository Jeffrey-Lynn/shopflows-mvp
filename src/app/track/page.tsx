"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Location {
  id: string;
  name: string;
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
};

export default function TrackPage() {
  const router = useRouter();
  const { session, loading, logout } = useAuth();
  const [vin, setVin] = useState("");
  const [fromLocationId, setFromLocationId] = useState<string | "">("");
  const [toLocationId, setToLocationId] = useState<string | "">("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!loading && !session?.isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    const loadLocations = async () => {
      if (!session?.shopId) return;
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name")
          .eq("shop_id", session.shopId)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        setLocations(data ?? []);
        setOffline(false);
      } catch (err) {
        console.error(err);
        setOffline(true);
      }
    };
    void loadLocations();
  }, [session?.shopId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.shopId) return;
    if (!vin || !toLocationId) {
      setError("VIN and destination are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const vinLast8 = vin.trim().slice(-8);

      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("shop_id", session.shopId)
        .eq("vin_last_8", vinLast8)
        .maybeSingle();

      if (vehicleError && vehicleError.code !== "PGRST116") {
        throw vehicleError;
      }

      let vehicleId = vehicle?.id as string | undefined;

      if (!vehicleId) {
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
        const { error: updateError } = await supabase
          .from("vehicles")
          .update({ current_location_id: toLocationId || null, updated_at: new Date().toISOString() })
          .eq("id", vehicleId);
        if (updateError) throw updateError;
      }

      const { error: movementError } = await supabase.from("vehicle_movements").insert({
        shop_id: session.shopId,
        vehicle_id: vehicleId,
        from_location_id: fromLocationId || null,
        to_location_id: toLocationId || null,
      });
      if (movementError) throw movementError;

      setVin("");
      setFromLocationId("");
      setToLocationId("");
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

        <form onSubmit={handleSubmit} style={s.form}>
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

          <div style={s.fieldGroup}>
            <label style={s.label}>From Location (optional)</label>
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
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
