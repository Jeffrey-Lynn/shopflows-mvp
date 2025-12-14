'use client';

import { useState, useMemo } from 'react';
import { useTerminology } from '@/lib/terminology';
import {
  type InventoryItem,
  type JobMaterial,
  formatQuantity,
  formatCurrency,
  calculateMaterialCost,
  getStockStatus,
} from '../types';
import { useInventoryItems } from '../hooks/useInventoryItems';
import { useAddMaterial } from '../hooks/useAddMaterial';

// =============================================================================
// Types
// =============================================================================

export interface MaterialUsageTrackerProps {
  /** Job/vehicle ID to add materials to */
  jobId: string;
  /** Organization ID */
  orgId: string;
  /** Current user ID */
  userId?: string;
  /** Callback when material is added */
  onMaterialAdded?: (material: JobMaterial) => void;
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid #2a2a2a',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as React.CSSProperties,
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
    margin: 0,
  } as React.CSSProperties,
  searchContainer: {
    marginBottom: '16px',
  } as React.CSSProperties,
  searchInput: {
    width: '100%',
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 14px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
  } as React.CSSProperties,
  itemList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
    marginBottom: '16px',
  } as React.CSSProperties,
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    backgroundColor: '#0a0a0a',
    borderRadius: '10px',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  itemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  } as React.CSSProperties,
  itemLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,
  itemName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
  } as React.CSSProperties,
  itemDetails: {
    fontSize: '12px',
    color: '#888888',
  } as React.CSSProperties,
  itemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  stockBadge: {
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 600,
  } as React.CSSProperties,
  // Selected item form
  selectedSection: {
    padding: '16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '12px',
    border: '1px solid #3b82f6',
    marginBottom: '16px',
  } as React.CSSProperties,
  selectedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  } as React.CSSProperties,
  selectedName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
  } as React.CSSProperties,
  selectedDetails: {
    fontSize: '13px',
    color: '#888888',
    marginTop: '4px',
  } as React.CSSProperties,
  clearButton: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid #2a2a2a',
    backgroundColor: 'transparent',
    color: '#888888',
    cursor: 'pointer',
  } as React.CSSProperties,
  inputGroup: {
    marginBottom: '16px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#888888',
    marginBottom: '6px',
  } as React.CSSProperties,
  inputRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
  } as React.CSSProperties,
  input: {
    flex: 1,
    height: '44px',
    borderRadius: '10px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    padding: '0 14px',
    fontSize: '15px',
    color: '#ffffff',
    outline: 'none',
  } as React.CSSProperties,
  unitLabel: {
    fontSize: '14px',
    color: '#888888',
    paddingBottom: '12px',
  } as React.CSSProperties,
  costPreview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '10px',
    marginBottom: '16px',
  } as React.CSSProperties,
  costLabel: {
    fontSize: '13px',
    color: '#888888',
  } as React.CSSProperties,
  costValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#22c55e',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    minHeight: '60px',
    borderRadius: '10px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  button: {
    width: '100%',
    height: '48px',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  addButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  } as React.CSSProperties,
  // States
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px 20px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  loadingState: {
    textAlign: 'center' as const,
    padding: '24px 20px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  errorState: {
    textAlign: 'center' as const,
    padding: '16px',
    color: '#ef4444',
    fontSize: '14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '10px',
    marginBottom: '16px',
  } as React.CSSProperties,
  successState: {
    textAlign: 'center' as const,
    padding: '16px',
    color: '#22c55e',
    fontSize: '14px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: '10px',
    marginBottom: '16px',
  } as React.CSSProperties,
  warningText: {
    fontSize: '12px',
    color: '#f59e0b',
    marginTop: '8px',
  } as React.CSSProperties,
};

// =============================================================================
// Component
// =============================================================================

export function MaterialUsageTracker({
  jobId,
  orgId,
  userId,
  onMaterialAdded,
}: MaterialUsageTrackerProps) {
  const terminology = useTerminology();
  
  // Use real hooks for data fetching
  const { items: allItems, loading, error: fetchError, refresh: refreshItems } = useInventoryItems(orgId);
  const { addMaterial, loading: submitting, error: addError, clearError } = useAddMaterial();
  
  // Only show items with stock
  const items = useMemo(() => allItems.filter(i => i.quantityOnHand > 0), [allItems]);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // Success state
  const [success, setSuccess] = useState(false);
  
  // Combined error
  const error = fetchError || addError;

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  // Calculate cost preview
  const quantityNum = parseFloat(quantity) || 0;
  const costPreview = selectedItem 
    ? calculateMaterialCost(quantityNum, selectedItem.costPerUnit)
    : 0;

  // Check if quantity exceeds stock
  const exceedsStock = selectedItem ? quantityNum > selectedItem.quantityOnHand : false;

  // Handle item selection
  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setQuantity('');
    setNotes('');
    setSuccess(false);
  };

  // Handle clear selection
  const handleClearSelection = () => {
    setSelectedItem(null);
    setQuantity('');
    setNotes('');
    setSuccess(false);
  };

  // Handle add material
  const handleAddMaterial = async () => {
    if (!selectedItem || quantityNum <= 0 || exceedsStock) return;
    
    clearError();
    
    const material = await addMaterial({
      orgId,
      jobId,
      itemId: selectedItem.id,
      quantityUsed: quantityNum,
      addedBy: userId,
      notes: notes || undefined,
    });
    
    if (material) {
      setSuccess(true);
      onMaterialAdded?.(material);
      
      // Refresh inventory to get updated quantities
      await refreshItems();
      
      // Reset form after short delay
      setTimeout(() => {
        handleClearSelection();
      }, 1500);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Add Materials</h3>
      </div>

      {/* Error State */}
      {error && (
        <div style={styles.errorState}>{error}</div>
      )}

      {/* Success State */}
      {success && (
        <div style={styles.successState}>
          ✓ Material added successfully
        </div>
      )}

      {/* Selected Item Form */}
      {selectedItem && !success && (
        <div style={styles.selectedSection}>
          <div style={styles.selectedHeader}>
            <div>
              <div style={styles.selectedName}>{selectedItem.name}</div>
              <div style={styles.selectedDetails}>
                {formatQuantity(selectedItem.quantityOnHand, selectedItem.unit)} available
                @ {formatCurrency(selectedItem.costPerUnit)}/{selectedItem.unit}
              </div>
            </div>
            <button
              style={styles.clearButton}
              onClick={handleClearSelection}
            >
              Change
            </button>
          </div>

          {/* Quantity Input */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Quantity to Use</label>
            <div style={styles.inputRow}>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={styles.input}
                placeholder="0"
                min="0"
                max={selectedItem.quantityOnHand}
                step="0.01"
              />
              <span style={styles.unitLabel}>{selectedItem.unit}</span>
            </div>
            {exceedsStock && (
              <p style={styles.warningText}>
                ⚠ Quantity exceeds available stock ({formatQuantity(selectedItem.quantityOnHand, selectedItem.unit)})
              </p>
            )}
          </div>

          {/* Cost Preview */}
          {quantityNum > 0 && (
            <div style={styles.costPreview}>
              <span style={styles.costLabel}>Material Cost</span>
              <span style={styles.costValue}>{formatCurrency(costPreview)}</span>
            </div>
          )}

          {/* Notes */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.textarea}
              placeholder="Where was this material used?"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddMaterial}
            disabled={submitting || quantityNum <= 0 || exceedsStock}
            style={{
              ...styles.button,
              ...styles.addButton,
              opacity: submitting || quantityNum <= 0 || exceedsStock ? 0.5 : 1,
            }}
          >
            {submitting ? 'Adding...' : `Add to ${terminology.item}`}
          </button>
        </div>
      )}

      {/* Item Selection */}
      {!selectedItem && (
        <>
          {/* Search */}
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <div style={styles.loadingState}>Loading inventory...</div>
          )}

          {/* Empty State */}
          {!loading && filteredItems.length === 0 && (
            <div style={styles.emptyState}>
              {searchQuery
                ? 'No materials match your search.'
                : 'No materials in stock.'}
            </div>
          )}

          {/* Item List */}
          {!loading && filteredItems.length > 0 && (
            <div style={styles.itemList}>
              {filteredItems.map(item => {
                const status = getStockStatus(item);
                return (
                  <div
                    key={item.id}
                    style={styles.item}
                    onClick={() => handleSelectItem(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2a2a2a';
                    }}
                  >
                    <div style={styles.itemLeft}>
                      <span style={styles.itemName}>{item.name}</span>
                      <span style={styles.itemDetails}>
                        {formatQuantity(item.quantityOnHand, item.unit)} @ {formatCurrency(item.costPerUnit)}
                      </span>
                    </div>
                    <div style={styles.itemRight}>
                      <span
                        style={{
                          ...styles.stockBadge,
                          color: status.color,
                          backgroundColor: status.bgColor,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
