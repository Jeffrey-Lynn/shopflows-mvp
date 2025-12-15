"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface Stage {
  id: string;
  name: string;
  order_index: number;
  color: string;
  is_terminal: boolean;
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

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
    flexDirection: "column" as const,
    gap: "12px",
    marginBottom: "24px",
  },
  formRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
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
  colorPicker: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap" as const,
  },
  colorSwatch: {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  colorSwatchSelected: {
    border: "2px solid #ffffff",
    transform: "scale(1.1)",
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    color: "#999999",
    cursor: "pointer",
  },
  checkboxInput: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
  },
  stageItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    backgroundColor: "#0a0a0a",
    borderRadius: "10px",
    marginBottom: "8px",
    borderLeft: "4px solid",
  },
  stageInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  stageName: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#ffffff",
  },
  stageOrder: {
    fontSize: "12px",
    color: "#666666",
  },
  terminalBadge: {
    fontSize: "10px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    textTransform: "uppercase" as const,
  },
  stageActions: {
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
  modalField: {
    marginBottom: "16px",
  },
  modalLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: "#666666",
    marginBottom: "8px",
    display: "block",
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

export default function StagesPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin, logout } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add form state
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newIsTerminal, setNewIsTerminal] = useState(false);
  
  // Edit modal state
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIsTerminal, setEditIsTerminal] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [authLoading, session, isAdmin, router]);

  const fetchStages = async () => {
    const orgId = session?.orgId || session?.shopId;
    if (!orgId) return;
    
    const { data } = await supabase
      .from("stages")
      .select("id, name, order_index, color, is_terminal")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("order_index", { ascending: true });
    
    if (data) {
      setStages(data.map(d => ({
        ...d,
        color: d.color || "#3b82f6",
        is_terminal: d.is_terminal || false,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    const orgId = session?.orgId || session?.shopId;
    if (orgId) fetchStages();
  }, [session?.orgId, session?.shopId]);

  const handleAdd = async () => {
    const orgId = session?.orgId || session?.shopId;
    if (!newName.trim() || !orgId) return;
    
    const maxOrder = stages.length > 0 ? Math.max(...stages.map((s) => s.order_index)) : 0;
    
    await supabase.from("stages").insert({
      org_id: orgId,
      name: newName.trim(),
      order_index: maxOrder + 1,
      color: newColor,
      is_terminal: newIsTerminal,
    });
    
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setNewIsTerminal(false);
    fetchStages();
  };

  const handleEdit = async () => {
    if (!editingStage || !editName.trim()) return;
    
    await supabase
      .from("stages")
      .update({ 
        name: editName.trim(),
        color: editColor,
        is_terminal: editIsTerminal,
      })
      .eq("id", editingStage.id);
    
    setEditingStage(null);
    fetchStages();
  };

  const handleDelete = async (id: string) => {
    await supabase
      .from("stages")
      .update({ is_active: false })
      .eq("id", id);
    setShowDeleteModal(null);
    fetchStages();
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const index = stages.findIndex((s) => s.id === id);
    if (index === -1) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= stages.length) return;

    const current = stages[index];
    const swap = stages[swapIndex];

    await Promise.all([
      supabase.from("stages").update({ order_index: swap.order_index }).eq("id", current.id),
      supabase.from("stages").update({ order_index: current.order_index }).eq("id", swap.id),
    ]);
    fetchStages();
  };

  const openEditModal = (stage: Stage) => {
    setEditingStage(stage);
    setEditName(stage.name);
    setEditColor(stage.color);
    setEditIsTerminal(stage.is_terminal);
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
          <a href="/admin/locations" style={{ ...s.navBtn, ...s.navBtnActive }}>Stages</a>
          <a href="/admin/devices" style={s.navBtn}>Devices</a>
          <button onClick={handleLogout} style={{ ...s.navBtn, color: "#ef4444", borderColor: "#ef4444" }}>
            Logout
          </button>
        </nav>
      </header>

      <h1 style={s.title}>Workflow Stages</h1>
      <p style={s.subtitle}>Define the stages jobs move through in your workflow</p>

      <div style={s.card}>
        {/* Add Stage Form */}
        <div style={s.addForm}>
          <div style={s.formRow}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New stage name"
              style={s.input}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} style={s.addBtn}>
              Add Stage
            </button>
          </div>
          
          <div style={s.formRow}>
            <div style={s.colorPicker}>
              {PRESET_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => setNewColor(color)}
                  style={{
                    ...s.colorSwatch,
                    backgroundColor: color,
                    ...(newColor === color ? s.colorSwatchSelected : {}),
                  }}
                />
              ))}
            </div>
            
            <label style={s.checkbox}>
              <input
                type="checkbox"
                checked={newIsTerminal}
                onChange={(e) => setNewIsTerminal(e.target.checked)}
                style={s.checkboxInput}
              />
              Terminal Stage (marks jobs complete)
            </label>
          </div>
        </div>

        {/* Stages List */}
        {loading ? (
          <div style={s.emptyState}>Loading stages...</div>
        ) : stages.length === 0 ? (
          <div style={s.emptyState}>No stages yet. Add your first stage above.</div>
        ) : (
          stages.map((stage, index) => (
            <div 
              key={stage.id} 
              style={{ ...s.stageItem, borderLeftColor: stage.color }}
            >
              <div style={s.stageInfo}>
                <span style={s.stageName}>{stage.name}</span>
                <span style={s.stageOrder}>#{index + 1}</span>
                {stage.is_terminal && (
                  <span style={s.terminalBadge}>Done</span>
                )}
              </div>
              <div style={s.stageActions}>
                <button
                  onClick={() => handleMove(stage.id, "up")}
                  disabled={index === 0}
                  style={{ ...s.actionBtn, ...s.moveBtn, opacity: index === 0 ? 0.3 : 1 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMove(stage.id, "down")}
                  disabled={index === stages.length - 1}
                  style={{ ...s.actionBtn, ...s.moveBtn, opacity: index === stages.length - 1 ? 0.3 : 1 }}
                >
                  ↓
                </button>
                <button
                  onClick={() => openEditModal(stage)}
                  style={{ ...s.actionBtn, ...s.editBtn }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteModal(stage.id)}
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
      {editingStage && (
        <div style={s.modal} onClick={() => setEditingStage(null)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Edit Stage</h3>
            
            <div style={s.modalField}>
              <label style={s.modalLabel}>Stage Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ ...s.input, width: "100%" }}
                autoFocus
              />
            </div>
            
            <div style={s.modalField}>
              <label style={s.modalLabel}>Color</label>
              <div style={s.colorPicker}>
                {PRESET_COLORS.map((color) => (
                  <div
                    key={color}
                    onClick={() => setEditColor(color)}
                    style={{
                      ...s.colorSwatch,
                      backgroundColor: color,
                      ...(editColor === color ? s.colorSwatchSelected : {}),
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div style={s.modalField}>
              <label style={s.checkbox}>
                <input
                  type="checkbox"
                  checked={editIsTerminal}
                  onChange={(e) => setEditIsTerminal(e.target.checked)}
                  style={s.checkboxInput}
                />
                Terminal Stage (marks jobs complete)
              </label>
            </div>
            
            <div style={s.modalActions}>
              <button onClick={() => setEditingStage(null)} style={s.cancelBtn}>
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
            <h3 style={s.modalTitle}>Delete Stage?</h3>
            <p style={{ color: "#999999", fontSize: "14px" }}>
              This will hide the stage. Jobs at this stage will keep their current stage until moved.
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
