"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Device {
  id: string;
  device_name: string;
  last_used_at: string | null;
  created_at: string;
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
  addBtn: {
    width: "100%",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#3b82f6",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    marginBottom: "20px",
  } as React.CSSProperties,
  deviceItem: {
    padding: "16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "12px",
    marginBottom: "12px",
    border: "1px solid #2a2a2a",
  },
  deviceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  deviceName: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#ffffff",
  },
  devicePin: {
    display: "inline-block",
    padding: "6px 12px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: "6px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#3b82f6",
    letterSpacing: "0.15em",
    fontFamily: "monospace",
  },
  deviceMeta: {
    display: "flex",
    gap: "16px",
    fontSize: "12px",
    color: "#666666",
    marginBottom: "12px",
  },
  deviceActions: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: {
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  regenerateBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6",
  },
  deleteBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
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
  input: {
    width: "100%",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 16px",
    fontSize: "15px",
    color: "#ffffff",
    outline: "none",
  } as React.CSSProperties,
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
  newDeviceInfo: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    border: "1px solid rgba(34, 197, 94, 0.2)",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "16px",
    textAlign: "center" as const,
  },
  newDevicePin: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#22c55e",
    letterSpacing: "0.2em",
    fontFamily: "monospace",
    marginTop: "8px",
  },
};

// Store PINs temporarily in memory (they're hashed in DB)
const devicePins: Record<string, string> = {};

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function DevicesPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin, logout } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceResult, setNewDeviceResult] = useState<{ name: string; pin: string } | null>(null);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  const fetchDevices = async () => {
    if (!session?.shopId) return;
    const { data } = await supabase
      .from("devices")
      .select("id, device_name, last_used_at, created_at")
      .eq("shop_id", session.shopId)
      .order("created_at", { ascending: true });
    if (data) setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    if (session?.shopId) fetchDevices();
  }, [session?.shopId]);

  const handleAddDevice = async () => {
    if (!newDeviceName.trim() || !session?.shopId) return;

    const pin = generatePin();
    const { data, error } = await supabase.rpc("create_device", {
      p_shop_id: session.shopId,
      p_device_name: newDeviceName.trim(),
      p_pin: pin,
    });

    if (error) {
      console.error("Error creating device:", error);
      return;
    }

    if (data?.success) {
      devicePins[data.device_id] = pin;
      setNewDeviceResult({ name: newDeviceName.trim(), pin });
      setNewDeviceName("");
      fetchDevices();
    }
  };

  const handleRegeneratePin = async (deviceId: string) => {
    const pin = generatePin();
    const { error } = await supabase.rpc("update_device_pin", {
      p_device_id: deviceId,
      p_new_pin: pin,
    });

    if (!error) {
      devicePins[deviceId] = pin;
      // Show the new PIN
      alert(`New PIN: ${pin}\n\nMake sure to update the device with this new PIN.`);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    await supabase.rpc("delete_device", { p_device_id: deviceId });
    delete devicePins[deviceId];
    setShowDeleteModal(null);
    fetchDevices();
  };

  const handleLogout = () => {
    logout();
    router.replace("/admin/login");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
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
          <a href="/admin/locations" style={s.navBtn}>Stages</a>
          <a href="/admin/devices" style={{ ...s.navBtn, ...s.navBtnActive }}>Devices</a>
          <button onClick={handleLogout} style={{ ...s.navBtn, color: "#ef4444", borderColor: "#ef4444" }}>
            Logout
          </button>
        </nav>
      </header>

      <h1 style={s.title}>Manage Devices</h1>
      <p style={s.subtitle}>Add kiosk devices and manage their PINs</p>

      <div style={s.card}>
        <button onClick={() => setShowAddModal(true)} style={s.addBtn}>
          + Add New Device
        </button>

        {loading ? (
          <div style={s.emptyState}>Loading devices...</div>
        ) : devices.length === 0 ? (
          <div style={s.emptyState}>No devices yet. Add your first kiosk device above.</div>
        ) : (
          devices.map((device) => (
            <div key={device.id} style={s.deviceItem}>
              <div style={s.deviceHeader}>
                <span style={s.deviceName}>{device.device_name}</span>
                <span style={s.devicePin}>
                  {devicePins[device.id] || "••••"}
                </span>
              </div>
              <div style={s.deviceMeta}>
                <span>Created: {formatDate(device.created_at)}</span>
                <span>Last used: {formatDate(device.last_used_at)}</span>
              </div>
              <div style={s.deviceActions}>
                <button
                  onClick={() => handleRegeneratePin(device.id)}
                  style={{ ...s.actionBtn, ...s.regenerateBtn }}
                >
                  Regenerate PIN
                </button>
                <button
                  onClick={() => setShowDeleteModal(device.id)}
                  style={{ ...s.actionBtn, ...s.deleteBtn }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}

        <p style={{ fontSize: "12px", color: "#666666", marginTop: "16px" }}>
          💡 PINs are shown only when created or regenerated. Store them securely.
        </p>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div style={s.modal} onClick={() => { setShowAddModal(false); setNewDeviceResult(null); }}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            {newDeviceResult ? (
              <>
                <h3 style={s.modalTitle}>Device Created!</h3>
                <p style={{ color: "#999999", fontSize: "14px" }}>
                  Your new device &quot;{newDeviceResult.name}&quot; has been created.
                </p>
                <div style={s.newDeviceInfo}>
                  <p style={{ color: "#22c55e", fontSize: "13px" }}>Device PIN:</p>
                  <p style={s.newDevicePin}>{newDeviceResult.pin}</p>
                </div>
                <p style={{ color: "#666666", fontSize: "12px", marginTop: "12px" }}>
                  Save this PIN! It won&apos;t be shown again.
                </p>
                <div style={s.modalActions}>
                  <button
                    onClick={() => { setShowAddModal(false); setNewDeviceResult(null); }}
                    style={s.confirmBtn}
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={s.modalTitle}>Add New Device</h3>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Device name (e.g., Front Desk Kiosk)"
                  style={s.input}
                  autoFocus
                />
                <p style={{ color: "#666666", fontSize: "12px", marginTop: "8px" }}>
                  A 4-digit PIN will be auto-generated for this device.
                </p>
                <div style={s.modalActions}>
                  <button onClick={() => setShowAddModal(false)} style={s.cancelBtn}>
                    Cancel
                  </button>
                  <button onClick={handleAddDevice} style={s.confirmBtn}>
                    Create Device
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={s.modal} onClick={() => setShowDeleteModal(null)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Delete Device?</h3>
            <p style={{ color: "#999999", fontSize: "14px" }}>
              This will permanently remove the device and its PIN. The device will no longer be able to log in.
            </p>
            <div style={s.modalActions}>
              <button onClick={() => setShowDeleteModal(null)} style={s.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(showDeleteModal)}
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
