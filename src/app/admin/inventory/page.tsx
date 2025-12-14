"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryQuantity,
} from "@/modules/inventory/services/inventoryService";
import {
  type InventoryItem,
  COMMON_UNITS,
  getStockStatus,
  formatCurrency,
  formatQuantity,
  calculateInventoryValue,
  isLowStock,
  isOutOfStock,
} from "@/modules/inventory/types";

type FilterType = "all" | "low_stock" | "out_of_stock";
type SortType = "name" | "quantity" | "value";
type ModalType = "add" | "edit" | "adjust" | null;

interface FormData {
  name: string;
  description: string;
  sku: string;
  unit: string;
  quantityOnHand: string;
  costPerUnit: string;
  lowStockThreshold: string;
  reorderQuantity: string;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  sku: "",
  unit: "each",
  quantityOnHand: "0",
  costPerUnit: "0",
  lowStockThreshold: "",
  reorderQuantity: "",
};

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
    marginBottom: "24px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  backBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#888888",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  title: {
    fontSize: "24px",
    fontWeight: 600,
    color: "#ffffff",
    margin: 0,
  },
  addBtn: {
    padding: "10px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#3b82f6",
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  statCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    padding: "16px",
    border: "1px solid #2a2a2a",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#666666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "4px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#ffffff",
  },
  controls: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap" as const,
  },
  searchInput: {
    flex: 1,
    minWidth: "200px",
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
  } as React.CSSProperties,
  select: {
    height: "40px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "20px",
    border: "1px solid #2a2a2a",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    textAlign: "left" as const,
    padding: "12px 8px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#666666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: "1px solid #2a2a2a",
  },
  td: {
    padding: "12px 8px",
    fontSize: "14px",
    color: "#ffffff",
    borderBottom: "1px solid #1a1a1a",
  },
  row: {
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  } as React.CSSProperties,
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
  actionBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,
  emptyState: {
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "#666666",
    fontSize: "14px",
  },
  loadingState: {
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "#666666",
    fontSize: "14px",
  },
  error: {
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "12px",
    color: "#ef4444",
    fontSize: "14px",
    marginBottom: "16px",
  },
  modalOverlay: {
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
  },
  modal: {
    backgroundColor: "#1a1a1a",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #2a2a2a",
    width: "100%",
    maxWidth: "500px",
    maxHeight: "90vh",
    overflowY: "auto" as const,
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#666666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    height: "44px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "0 12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    height: "80px",
    borderRadius: "8px",
    backgroundColor: "#0a0a0a",
    border: "1px solid #2a2a2a",
    padding: "12px",
    fontSize: "14px",
    color: "#ffffff",
    outline: "none",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#888888",
    backgroundColor: "transparent",
    border: "1px solid #2a2a2a",
    cursor: "pointer",
  } as React.CSSProperties,
  submitBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#3b82f6",
    border: "none",
    cursor: "pointer",
  } as React.CSSProperties,
  adjustInfo: {
    padding: "12px",
    backgroundColor: "#0a0a0a",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  adjustChange: {
    fontSize: "18px",
    fontWeight: 600,
    marginTop: "8px",
  },
};

export default function InventoryManagementPage() {
  const router = useRouter();
  const { session, loading: authLoading, isAdmin } = useAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("name");

  const [modal, setModal] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!session?.isAuthenticated || !isAdmin)) {
      router.replace("/login");
    }
  }, [authLoading, session, isAdmin, router]);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    const orgId = session?.orgId || session?.shopId;
    if (!orgId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getInventoryItems(orgId);
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setError("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [session?.orgId, session?.shopId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !item.name.toLowerCase().includes(searchLower) &&
          !item.sku?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      // Status filter
      if (filter === "low_stock") {
        return isLowStock(item.quantityOnHand, item.lowStockThreshold) && !isOutOfStock(item.quantityOnHand);
      }
      if (filter === "out_of_stock") {
        return isOutOfStock(item.quantityOnHand);
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "quantity") return b.quantityOnHand - a.quantityOnHand;
      if (sort === "value") {
        const aValue = a.quantityOnHand * a.costPerUnit;
        const bValue = b.quantityOnHand * b.costPerUnit;
        return bValue - aValue;
      }
      return 0;
    });

  // Summary stats
  const totalItems = items.length;
  const totalValue = calculateInventoryValue(items);
  const lowStockCount = items.filter(
    (i) => isLowStock(i.quantityOnHand, i.lowStockThreshold) && !isOutOfStock(i.quantityOnHand)
  ).length;
  const outOfStockCount = items.filter((i) => isOutOfStock(i.quantityOnHand)).length;

  // Modal handlers
  const openAddModal = () => {
    setFormData(emptyForm);
    setSelectedItem(null);
    setModal("add");
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      sku: item.sku || "",
      unit: item.unit,
      quantityOnHand: item.quantityOnHand.toString(),
      costPerUnit: item.costPerUnit.toString(),
      lowStockThreshold: item.lowStockThreshold?.toString() || "",
      reorderQuantity: item.reorderQuantity?.toString() || "",
    });
    setModal("edit");
  };

  const openAdjustModal = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setAdjustQuantity(item.quantityOnHand.toString());
    setModal("adjust");
  };

  const closeModal = () => {
    setModal(null);
    setSelectedItem(null);
    setFormData(emptyForm);
    setAdjustQuantity("");
  };

  // Form handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const orgId = session?.orgId || session?.shopId;
    if (!orgId) return;

    setSaving(true);
    setError(null);

    try {
      if (modal === "add") {
        await createInventoryItem(orgId, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          sku: formData.sku.trim() || undefined,
          unit: formData.unit,
          quantityOnHand: parseFloat(formData.quantityOnHand) || 0,
          costPerUnit: parseFloat(formData.costPerUnit) || 0,
          lowStockThreshold: formData.lowStockThreshold
            ? parseFloat(formData.lowStockThreshold)
            : undefined,
          reorderQuantity: formData.reorderQuantity
            ? parseFloat(formData.reorderQuantity)
            : undefined,
        });
      } else if (modal === "edit" && selectedItem) {
        await updateInventoryItem(selectedItem.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          sku: formData.sku.trim() || null,
          unit: formData.unit,
          quantityOnHand: parseFloat(formData.quantityOnHand) || 0,
          costPerUnit: parseFloat(formData.costPerUnit) || 0,
          lowStockThreshold: formData.lowStockThreshold
            ? parseFloat(formData.lowStockThreshold)
            : null,
          reorderQuantity: formData.reorderQuantity
            ? parseFloat(formData.reorderQuantity)
            : null,
        });
      } else if (modal === "adjust" && selectedItem) {
        await adjustInventoryQuantity(selectedItem.id, parseFloat(adjustQuantity) || 0);
      }

      closeModal();
      await fetchInventory();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <main style={s.page}>
        <div style={s.loadingState}>Loading...</div>
      </main>
    );
  }

  return (
    <main style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <button
            style={s.backBtn}
            onClick={() => router.push("/admin")}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3b82f6";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#888888";
            }}
          >
            ← Back
          </button>
          <h1 style={s.title}>Inventory Management</h1>
        </div>
        <button
          style={s.addBtn}
          onClick={openAddModal}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
        >
          + Add Item
        </button>
      </div>

      {/* Summary Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Items</div>
          <div style={s.statValue}>{totalItems}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Value</div>
          <div style={s.statValue}>{formatCurrency(totalValue)}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Low Stock</div>
          <div style={{ ...s.statValue, color: lowStockCount > 0 ? "#f59e0b" : "#ffffff" }}>
            {lowStockCount}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Out of Stock</div>
          <div style={{ ...s.statValue, color: outOfStockCount > 0 ? "#ef4444" : "#ffffff" }}>
            {outOfStockCount}
          </div>
        </div>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {/* Controls */}
      <div style={s.controls}>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          style={s.select}
        >
          <option value="all">All Items</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          style={s.select}
        >
          <option value="name">Sort: Name</option>
          <option value="quantity">Sort: Quantity</option>
          <option value="value">Sort: Value</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div style={s.card}>
        {loading ? (
          <div style={s.loadingState}>Loading inventory...</div>
        ) : filteredItems.length === 0 ? (
          <div style={s.emptyState}>
            {items.length === 0
              ? "No inventory items yet. Click '+ Add Item' to get started."
              : "No items match your search/filter."}
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>SKU</th>
                <th style={s.th}>Quantity</th>
                <th style={s.th}>Unit</th>
                <th style={s.th}>Cost/Unit</th>
                <th style={s.th}>Total Value</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const status = getStockStatus(item);
                const totalItemValue = item.quantityOnHand * item.costPerUnit;
                return (
                  <tr
                    key={item.id}
                    style={s.row}
                    onClick={() => openEditModal(item)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#0a0a0a")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={s.td}>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: "12px", color: "#666666", marginTop: "2px" }}>
                          {item.description.slice(0, 50)}
                          {item.description.length > 50 ? "..." : ""}
                        </div>
                      )}
                    </td>
                    <td style={{ ...s.td, fontFamily: "monospace", color: "#888888" }}>
                      {item.sku || "-"}
                    </td>
                    <td style={s.td}>{item.quantityOnHand}</td>
                    <td style={{ ...s.td, color: "#888888" }}>{item.unit}</td>
                    <td style={s.td}>{formatCurrency(item.costPerUnit)}</td>
                    <td style={s.td}>{formatCurrency(totalItemValue)}</td>
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.badge,
                          color: status.color,
                          backgroundColor: status.bgColor,
                        }}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td style={s.td}>
                      <button
                        style={s.actionBtn}
                        onClick={(e) => openAdjustModal(item, e)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                        }}
                      >
                        Adjust Qty
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <div style={s.modalOverlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>
              {modal === "add" ? "Add Inventory Item" : "Edit Inventory Item"}
            </h2>

            <div style={s.formGroup}>
              <label style={s.label}>Name *</label>
              <input
                type="text"
                style={s.input}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Item name"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <textarea
                style={s.textarea}
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>SKU</label>
                <input
                  type="text"
                  style={s.input}
                  value={formData.sku}
                  onChange={(e) => handleInputChange("sku", e.target.value)}
                  placeholder="Optional SKU"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Unit *</label>
                <select
                  style={{ ...s.input, cursor: "pointer" }}
                  value={formData.unit}
                  onChange={(e) => handleInputChange("unit", e.target.value)}
                >
                  {COMMON_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Quantity on Hand</label>
                <input
                  type="number"
                  style={s.input}
                  value={formData.quantityOnHand}
                  onChange={(e) => handleInputChange("quantityOnHand", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Cost per Unit *</label>
                <input
                  type="number"
                  style={s.input}
                  value={formData.costPerUnit}
                  onChange={(e) => handleInputChange("costPerUnit", e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div style={s.formRow}>
              <div style={s.formGroup}>
                <label style={s.label}>Low Stock Threshold</label>
                <input
                  type="number"
                  style={s.input}
                  value={formData.lowStockThreshold}
                  onChange={(e) => handleInputChange("lowStockThreshold", e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Reorder Quantity</label>
                <input
                  type="number"
                  style={s.input}
                  value={formData.reorderQuantity}
                  onChange={(e) => handleInputChange("reorderQuantity", e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button
                style={{
                  ...s.submitBtn,
                  opacity: saving || !formData.name.trim() ? 0.5 : 1,
                  cursor: saving || !formData.name.trim() ? "not-allowed" : "pointer",
                }}
                onClick={handleSubmit}
                disabled={saving || !formData.name.trim()}
              >
                {saving ? "Saving..." : modal === "add" ? "Add Item" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Quantity Modal */}
      {modal === "adjust" && selectedItem && (
        <div style={s.modalOverlay} onClick={closeModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>Adjust Quantity</h2>

            <div style={s.adjustInfo}>
              <div style={{ fontWeight: 500, color: "#ffffff" }}>{selectedItem.name}</div>
              <div style={{ fontSize: "13px", color: "#888888", marginTop: "4px" }}>
                Current: {formatQuantity(selectedItem.quantityOnHand, selectedItem.unit)}
              </div>
              {adjustQuantity && (
                <div
                  style={{
                    ...s.adjustChange,
                    color:
                      parseFloat(adjustQuantity) > selectedItem.quantityOnHand
                        ? "#22c55e"
                        : parseFloat(adjustQuantity) < selectedItem.quantityOnHand
                        ? "#ef4444"
                        : "#888888",
                  }}
                >
                  {parseFloat(adjustQuantity) > selectedItem.quantityOnHand
                    ? `+${(parseFloat(adjustQuantity) - selectedItem.quantityOnHand).toFixed(2)}`
                    : parseFloat(adjustQuantity) < selectedItem.quantityOnHand
                    ? `${(parseFloat(adjustQuantity) - selectedItem.quantityOnHand).toFixed(2)}`
                    : "No change"}
                </div>
              )}
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>New Quantity ({selectedItem.unit})</label>
              <input
                type="number"
                style={s.input}
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                min="0"
                step="0.01"
                autoFocus
              />
            </div>

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button
                style={{
                  ...s.submitBtn,
                  opacity: saving ? 0.5 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Saving..." : "Update Quantity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
