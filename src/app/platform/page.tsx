"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface PlatformStats {
  totalShops: number;
  totalVehicles: number;
  totalDevices: number;
  totalMovements: number;
}

interface Shop {
  id: string;
  name: string;
  owner_email: string | null;
  created_at: string;
  vehicle_count: number;
  device_count: number;
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "32px",
    flexWrap: "wrap" as const,
    gap: "12px",
  },
  logo: {
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.2em",
    color: "#ef4444",
  },
  navLinks: {
    display: "flex",
    gap: "12px",
  },
  navBtn: {
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#999999",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    textDecoration: "none",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#666666",
    marginBottom: "32px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "32px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
  },
  statValue: {
    fontSize: "36px",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "4px",
  },
  statLabel: {
    fontSize: "13px",
    color: "#666666",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 120px",
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
    gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 120px",
    gap: "12px",
    padding: "14px 16px",
    fontSize: "14px",
    color: "#999999",
    borderBottom: "1px solid #1a1a1a",
    alignItems: "center",
  },
  shopName: {
    color: "#ffffff",
    fontWeight: 500,
  },
  viewBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  emptyState: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PlatformPage() {
  const router = useRouter();
  const { session, loading: authLoading, loginAdmin } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Fetch all counts
        const [shopsRes, vehiclesRes, devicesRes, movementsRes] = await Promise.all([
          supabase.from("shops").select("id", { count: "exact", head: true }),
          supabase.from("vehicles").select("id", { count: "exact", head: true }),
          supabase.from("devices").select("id", { count: "exact", head: true }),
          supabase.from("vehicle_movements").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          totalShops: shopsRes.count || 0,
          totalVehicles: vehiclesRes.count || 0,
          totalDevices: devicesRes.count || 0,
          totalMovements: movementsRes.count || 0,
        });

        // Fetch shops with owner info
        const { data: shopsData } = await supabase
          .from("shops")
          .select("id, name, created_at, contact_email")
          .order("created_at", { ascending: false });

        if (shopsData) {
          // Get vehicle and device counts per shop
          const shopIds = shopsData.map(s => s.id);
          
          const [vehicleCounts, deviceCounts] = await Promise.all([
            supabase.from("vehicles").select("shop_id").in("shop_id", shopIds),
            supabase.from("devices").select("shop_id").in("shop_id", shopIds),
          ]);

          const vehicleCountMap = new Map<string, number>();
          const deviceCountMap = new Map<string, number>();

          (vehicleCounts.data || []).forEach(v => {
            vehicleCountMap.set(v.shop_id, (vehicleCountMap.get(v.shop_id) || 0) + 1);
          });

          (deviceCounts.data || []).forEach(d => {
            deviceCountMap.set(d.shop_id, (deviceCountMap.get(d.shop_id) || 0) + 1);
          });

          const mapped: Shop[] = shopsData.map(shop => ({
            id: shop.id,
            name: shop.name,
            owner_email: shop.contact_email,
            created_at: shop.created_at,
            vehicle_count: vehicleCountMap.get(shop.id) || 0,
            device_count: deviceCountMap.get(shop.id) || 0,
          }));

          setShops(mapped);
        }
      } catch (err) {
        console.error("Error fetching platform data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isPlatformAdmin) fetchData();
  }, [isPlatformAdmin]);

  const handleViewShop = (shop: Shop) => {
    // Impersonate shop admin - switch context to that shop
    loginAdmin({
      shopId: shop.id,
      userId: session?.userId || "",
      email: session?.email || "",
      name: session?.name || "",
      role: "platform_admin", // Keep platform admin role
    });
    router.push("/admin");
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  if (!isPlatformAdmin) {
    return <div style={s.emptyState}>Access denied. Platform admin only.</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <div>
          <span style={s.logo}>SHOPFLOWS PLATFORM</span>
          <span style={s.badge}>GOD MODE</span>
        </div>
        <div style={s.navLinks}>
          <a href="/platform/vehicles" style={s.navBtn}>All Vehicles</a>
          <a href="/platform/activity" style={s.navBtn}>All Activity</a>
          <a href="/admin/invites" style={s.navBtn}>Invites</a>
        </div>
      </header>

      <h1 style={s.title}>Platform Overview</h1>
      <p style={s.subtitle}>Monitor all shops and activity across the platform</p>

      {/* Stats Grid */}
      {loading ? (
        <div style={s.emptyState}>Loading stats...</div>
      ) : stats && (
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalShops}</div>
            <div style={s.statLabel}>Total Shops</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalVehicles}</div>
            <div style={s.statLabel}>Total Vehicles</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalDevices}</div>
            <div style={s.statLabel}>Total Devices</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statValue}>{stats.totalMovements}</div>
            <div style={s.statLabel}>Total Movements</div>
          </div>
        </div>
      )}

      {/* All Shops */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>All Shops</h2>
        <div style={s.card}>
          {loading ? (
            <div style={s.emptyState}>Loading shops...</div>
          ) : shops.length === 0 ? (
            <div style={s.emptyState}>No shops yet.</div>
          ) : (
            <>
              <div style={s.tableHeader}>
                <span>Shop Name</span>
                <span>Owner Email</span>
                <span>Created</span>
                <span>Vehicles</span>
                <span>Devices</span>
                <span>Action</span>
              </div>
              {shops.map(shop => (
                <div key={shop.id} style={s.tableRow}>
                  <span style={s.shopName}>{shop.name}</span>
                  <span>{shop.owner_email || "—"}</span>
                  <span>{formatDate(shop.created_at)}</span>
                  <span>{shop.vehicle_count}</span>
                  <span>{shop.device_count}</span>
                  <button
                    onClick={() => handleViewShop(shop)}
                    style={s.viewBtn}
                  >
                    View Shop
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
