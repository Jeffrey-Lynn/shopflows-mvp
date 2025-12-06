"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface CompletionData {
  vin_last_8: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
}

interface Stats {
  avgHours: number;
  minHours: number;
  maxHours: number;
  totalCompleted: number;
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
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
    textAlign: "center" as const,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#666666",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
    marginBottom: "24px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
  },
  completionItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "10px",
    marginBottom: "8px",
    border: "1px solid #2a2a2a",
  },
  completionVin: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
  },
  completionDates: {
    fontSize: "12px",
    color: "#666666",
    marginTop: "4px",
  },
  completionDuration: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#3b82f6",
  },
  durationBar: {
    height: "8px",
    backgroundColor: "#2a2a2a",
    borderRadius: "4px",
    marginTop: "8px",
    overflow: "hidden",
  },
  durationFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: "4px",
    transition: "width 0.3s ease",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
  },
  note: {
    fontSize: "12px",
    color: "#666666",
    marginTop: "16px",
    fontStyle: "italic" as const,
  },
};

function formatDuration(hours: number): string {
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = hours / 24;
  if (days < 1.5) return "1 day";
  return `${days.toFixed(1)} days`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [completions, setCompletions] = useState<CompletionData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.shopId) return;

      try {
        // Find "Complete" location
        const { data: locations } = await supabase
          .from("locations")
          .select("id, name")
          .eq("shop_id", session.shopId);

        const completeLocation = locations?.find(l => 
          l.name.toLowerCase().includes("complete")
        );

        if (!completeLocation) {
          setLoading(false);
          return;
        }

        // Get completed movements (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: completedMovements } = await supabase
          .from("vehicle_movements")
          .select("vehicle_id, moved_at")
          .eq("shop_id", session.shopId)
          .eq("to_location_id", completeLocation.id)
          .gte("moved_at", thirtyDaysAgo.toISOString())
          .order("moved_at", { ascending: false })
          .limit(50);

        if (!completedMovements || completedMovements.length === 0) {
          setLoading(false);
          return;
        }

        // Get unique vehicle IDs
        const vehicleIds = Array.from(new Set(completedMovements.map(m => m.vehicle_id)));

        // Get vehicle info and first movements
        const [vehiclesRes, firstMovementsRes] = await Promise.all([
          supabase.from("vehicles").select("id, vin_last_8").in("id", vehicleIds),
          supabase
            .from("vehicle_movements")
            .select("vehicle_id, moved_at")
            .eq("shop_id", session.shopId)
            .in("vehicle_id", vehicleIds)
            .order("moved_at", { ascending: true }),
        ]);

        const vehicleMap = new Map((vehiclesRes.data || []).map(v => [v.id, v.vin_last_8]));
        
        // Build first movement map
        const firstMoveMap = new Map<string, string>();
        (firstMovementsRes.data || []).forEach(m => {
          if (!firstMoveMap.has(m.vehicle_id)) {
            firstMoveMap.set(m.vehicle_id, m.moved_at);
          }
        });

        // Calculate completion times
        const completionData: CompletionData[] = [];
        const durations: number[] = [];

        completedMovements.forEach(cm => {
          const firstMove = firstMoveMap.get(cm.vehicle_id);
          if (firstMove) {
            const start = new Date(firstMove);
            const end = new Date(cm.moved_at);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            
            if (hours > 0) {
              completionData.push({
                vin_last_8: vehicleMap.get(cm.vehicle_id) || "Unknown",
                start_date: firstMove,
                end_date: cm.moved_at,
                duration_hours: hours,
              });
              durations.push(hours);
            }
          }
        });

        setCompletions(completionData);

        if (durations.length > 0) {
          const sum = durations.reduce((a, b) => a + b, 0);
          setStats({
            avgHours: sum / durations.length,
            minHours: Math.min(...durations),
            maxHours: Math.max(...durations),
            totalCompleted: durations.length,
          });
        }
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.shopId) fetchData();
  }, [session?.shopId]);

  const maxDuration = stats?.maxHours || 1;

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>SHOPFLOWS ADMIN</span>
        <a href="/admin" style={s.backBtn}>← Back to Dashboard</a>
      </header>

      <h1 style={s.title}>Analytics</h1>
      <p style={s.subtitle}>Completion time trends (last 30 days)</p>

      {loading ? (
        <div style={s.emptyState}>Loading analytics...</div>
      ) : !stats ? (
        <div style={s.card}>
          <div style={s.emptyState}>
            No completed vehicles found. Vehicles are marked complete when moved to a location containing &quot;Complete&quot; in the name.
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statValue}>{formatDuration(stats.avgHours)}</div>
              <div style={s.statLabel}>Average Time</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>{formatDuration(stats.minHours)}</div>
              <div style={s.statLabel}>Fastest</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>{formatDuration(stats.maxHours)}</div>
              <div style={s.statLabel}>Slowest</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statValue}>{stats.totalCompleted}</div>
              <div style={s.statLabel}>Completed</div>
            </div>
          </div>

          {/* Recent Completions */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Recent Completions</h2>
            {completions.slice(0, 20).map((completion, index) => (
              <div key={index} style={s.completionItem}>
                <div>
                  <div style={s.completionVin}>{completion.vin_last_8}</div>
                  <div style={s.completionDates}>
                    {new Date(completion.start_date).toLocaleDateString()} → {new Date(completion.end_date).toLocaleDateString()}
                  </div>
                  <div style={s.durationBar}>
                    <div
                      style={{
                        ...s.durationFill,
                        width: `${Math.min((completion.duration_hours / maxDuration) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div style={s.completionDuration}>
                  {formatDuration(completion.duration_hours)}
                </div>
              </div>
            ))}
            <p style={s.note}>
              Completion time = time from first movement to &quot;Complete&quot; location
            </p>
          </div>
        </>
      )}
    </main>
  );
}
