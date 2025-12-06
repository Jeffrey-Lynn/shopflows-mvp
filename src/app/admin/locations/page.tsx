"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Location {
  id: string;
  name: string;
  sort_order: number;
}

const s = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "700px",
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
  nav: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
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
    transition: "all 0.15s ease",
    textDecoration: "none",
  } as React.CSSProperties,
  navBtnActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    color: "#ffffff",
  },
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
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
    marginBottom: "16px",
  },
  addForm: {
    display: "flex",
    gap: "12px",
    marginBottom: "24px",
  },
  input: {
    flex: 1,
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "15px",
    color: "#ffffff",
    outline: "none",
  } as React.CSSProperties,
  addBtn: {
    height: "48px",
    padding: "0 20px",
    borderRadius: "10px",
    backgroundColor: "#3b82f6",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  locationItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "10px",
    marginBottom: "8px",
    border: "1px solid #2a2a2a",
  },
  locationName: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#ffffff",
  },
  locationOrder: {
    fontSize: "12px",
    color: "#666666",
    marginLeft: "8px",
  },
  locationActions: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: {
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  editBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
  },
  moveBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#999999",
    padding: "8px",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666666",
  },
  modal: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid #2a2a2a",
  },
  modalTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "16px",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "20px",
  },
  cancelBtn: {
    flex: 1,
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    color: "#999999",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
  } as React.CSSProperties,
  confirmBtn: {
    flex: 1,
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "#3b82f6",
    border: "none",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
};

export default function LocationsPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin, logout } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  const fetchLocations = async () => {
    if (!session?.shopId) return;
    const { data } = await supabase
      .from("locations")
      .select("id, name, sort_order")
      .eq("shop_id", session.shopId)
      .order("sort_order", { ascending: true });
    if (data) setLocations(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session?.shopId) fetchLocations();
  }, [session?.shopId]);

  const handleAdd = async () => {
    if (!newName.trim() || !session?.shopId) return;
    const maxOrder = locations.length > 0 ? Math.max(...locations.map((l) => l.sort_order)) : 0;
    await supabase.from("locations").insert({
      shop_id: session.shopId,
      name: newName.trim(),
      sort_order: maxOrder + 1,
    });
    setNewName("");
    fetchLocations();
  };

  const handleEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await supabase
      .from("locations")
      .update({ name: editName.trim() })
      .eq("id", editingId);
    setEditingId(null);
    setEditName("");
    fetchLocations();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("locations").delete().eq("id", id);
    setShowDeleteModal(null);
    fetchLocations();
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const index = locations.findIndex((l) => l.id === id);
    if (index === -1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= locations.length) return;

    const current = locations[index];
    const swap = locations[swapIndex];

    await Promise.all([
      supabase.from("locations").update({ sort_order: swap.sort_order }).eq("id", current.id),
      supabase.from("locations").update({ sort_order: current.sort_order }).eq("id", swap.id),
    ]);
    fetchLocations();
  };

  const handleLogout = () => {
    logout();
    router.replace("/admin/login");
  };

  if (authLoading || !session?.isAuthenticated) {
    return <div style={s.emptyState}>Loading...</div>;
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <span style={s.logo}>SHOPFLOWS ADMIN</span>
        <nav style={s.nav}>
          <a href="/admin" style={s.navBtn}>Dashboard</a>
          <a href="/admin/locations" style={{ ...s.navBtn, ...s.navBtnActive }}>Locations</a>
          <a href="/admin/devices" style={s.navBtn}>Devices</a>
          <button onClick={handleLogout} style={{ ...s.navBtn, color: "#ef4444", borderColor: "#ef4444" }}>
            Logout
          </button>
        </nav>
      </header>

      <h1 style={s.title}>Manage Locations</h1>
      <p style={s.subtitle}>Add, edit, and reorder your shop locations</p>

      <div style={s.card}>
        <div style={s.addForm}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New location name"
            style={s.input}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button onClick={handleAdd} style={s.addBtn}>
            Add Location
          </button>
        </div>

        {loading ? (
          <div style={s.emptyState}>Loading locations...</div>
        ) : locations.length === 0 ? (
          <div style={s.emptyState}>No locations yet. Add your first location above.</div>
        ) : (
          locations.map((location, index) => (
            <div key={location.id} style={s.locationItem}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={s.locationName}>{location.name}</span>
                <span style={s.locationOrder}>#{index + 1}</span>
              </div>
              <div style={s.locationActions}>
                <button
                  onClick={() => handleMove(location.id, "up")}
                  disabled={index === 0}
                  style={{ ...s.actionBtn, ...s.moveBtn, opacity: index === 0 ? 0.3 : 1 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMove(location.id, "down")}
                  disabled={index === locations.length - 1}
                  style={{ ...s.actionBtn, ...s.moveBtn, opacity: index === locations.length - 1 ? 0.3 : 1 }}
                >
                  ↓
                </button>
                <button
                  onClick={() => {
                    setEditingId(location.id);
                    setEditName(location.name);
                  }}
                  style={{ ...s.actionBtn, ...s.editBtn }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(location.id)}
                  style={{ ...s.actionBtn, ...s.deleteBtn }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div style={s.modal} onClick={() => setEditingId(null)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Edit Location</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ ...s.input, width: "100%", marginBottom: "0" }}
              autoFocus
            />
            <div style={s.modalActions}>
              <button onClick={() => setEditingId(null)} style={s.cancelBtn}>
                Cancel
              </button>
              <button onClick={handleEdit} style={s.confirmBtn}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={s.modal} onClick={() => setShowDeleteModal(null)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Delete Location?</h3>
            <p style={{ color: "#999999", fontSize: "14px" }}>
              This will remove the location. Vehicles at this location will show &quot;No location&quot;.
            </p>
            <div style={s.modalActions}>
              <button onClick={() => setShowDeleteModal(null)} style={s.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal)}
                style={{ ...s.confirmBtn, backgroundColor: "#ef4444" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
