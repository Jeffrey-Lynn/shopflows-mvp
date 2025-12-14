'use client';

import { useState, useMemo } from 'react';
import { useTerminology } from '@/lib/terminology';
import {
  type InventoryItem,
  formatQuantity,
  formatCurrency,
  getStockStatus,
} from '../types';
import { useInventoryItems } from '../hooks/useInventoryItems';

// =============================================================================
// Types
// =============================================================================

export interface InventoryListProps {
  /** Organization ID to fetch inventory for */
  orgId: string;
  /** Callback when an item is clicked */
  onItemClick?: (item: InventoryItem) => void;
  /** Compact mode shows less detail */
  compact?: boolean;
  /** Filter to only show items with low/out of stock */
  showLowStockOnly?: boolean;
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
  badge: {
    fontSize: '12px',
    color: '#888888',
    backgroundColor: '#0a0a0a',
    padding: '4px 10px',
    borderRadius: '12px',
  } as React.CSSProperties,
  searchContainer: {
    marginBottom: '16px',
  } as React.CSSProperties,
  searchInput: {
    width: '100%',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#0a0a0a',
    border: '1px solid #2a2a2a',
    padding: '0 14px',
    fontSize: '14px',
    color: '#ffffff',
    outline: 'none',
  } as React.CSSProperties,
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  } as React.CSSProperties,
  filterButton: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    border: '1px solid #2a2a2a',
    backgroundColor: 'transparent',
    color: '#888888',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: '#ffffff',
  } as React.CSSProperties,
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as React.CSSProperties,
  itemLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  } as React.CSSProperties,
  itemName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
  } as React.CSSProperties,
  itemSku: {
    fontSize: '12px',
    color: '#666666',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  itemDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#888888',
  } as React.CSSProperties,
  itemRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '4px',
  } as React.CSSProperties,
  stockBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 600,
  } as React.CSSProperties,
  itemValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#22c55e',
  } as React.CSSProperties,
  // Compact styles
  compactItem: {
    padding: '10px 14px',
  } as React.CSSProperties,
  compactDetails: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  } as React.CSSProperties,
  // Summary
  summary: {
    marginTop: '16px',
    padding: '14px 16px',
    backgroundColor: '#0a0a0a',
    borderRadius: '12px',
    border: '1px solid #2a2a2a',
  } as React.CSSProperties,
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  summaryLabel: {
    fontSize: '13px',
    color: '#888888',
  } as React.CSSProperties,
  summaryValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ffffff',
  } as React.CSSProperties,
  // States
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 20px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  loadingState: {
    textAlign: 'center' as const,
    padding: '32px 20px',
    color: '#666666',
    fontSize: '14px',
  } as React.CSSProperties,
  errorState: {
    textAlign: 'center' as const,
    padding: '20px',
    color: '#ef4444',
    fontSize: '14px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '10px',
  } as React.CSSProperties,
};

// =============================================================================
// Component
// =============================================================================

type FilterType = 'all' | 'low' | 'out';

export function InventoryList({
  orgId,
  onItemClick,
  compact = false,
  showLowStockOnly = false,
}: InventoryListProps) {
  const terminology = useTerminology();
  
  // Use real hook for data fetching with realtime updates
  const { 
    items, 
    loading, 
    error, 
    lowStockCount, 
    outOfStockCount, 
    totalValue 
  } = useInventoryItems(orgId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>(showLowStockOnly ? 'low' : 'all');

  // Filter and search items
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Apply stock filter
    if (filter === 'low') {
      result = result.filter(item => 
        item.quantityOnHand <= (item.lowStockThreshold ?? 0) && item.quantityOnHand > 0
      );
    } else if (filter === 'out') {
      result = result.filter(item => item.quantityOnHand <= 0);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, filter, searchQuery]);

  // Render item
  const renderItem = (item: InventoryItem) => {
    const status = getStockStatus(item);
    const itemValue = item.quantityOnHand * item.costPerUnit;
    
    if (compact) {
      return (
        <div
          key={item.id}
          style={{ ...styles.item, ...styles.compactItem }}
          onClick={() => onItemClick?.(item)}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a2a';
          }}
        >
          <div style={styles.compactDetails}>
            <span style={styles.itemName}>{item.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#888888', fontSize: '13px' }}>
                {formatQuantity(item.quantityOnHand, item.unit)}
              </span>
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
        </div>
      );
    }
    
    return (
      <div
        key={item.id}
        style={styles.item}
        onClick={() => onItemClick?.(item)}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#3b82f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2a2a';
        }}
      >
        <div style={styles.itemLeft}>
          <span style={styles.itemName}>{item.name}</span>
          {item.sku && <span style={styles.itemSku}>{item.sku}</span>}
          <div style={styles.itemDetails}>
            <span>{formatQuantity(item.quantityOnHand, item.unit)}</span>
            <span>@ {formatCurrency(item.costPerUnit)}/{item.unit}</span>
          </div>
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
          <span style={styles.itemValue}>{formatCurrency(itemValue)}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Inventory</h3>
        <span style={styles.badge}>
          {loading ? '...' : `${items.length} items`}
        </span>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Filters */}
      {!compact && (
        <div style={styles.filterRow}>
          <button
            style={{
              ...styles.filterButton,
              ...(filter === 'all' ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilter('all')}
          >
            All ({items.length})
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filter === 'low' ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilter('low')}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            style={{
              ...styles.filterButton,
              ...(filter === 'out' ? styles.filterButtonActive : {}),
            }}
            onClick={() => setFilter('out')}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingState}>Loading inventory...</div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorState}>{error}</div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div style={styles.emptyState}>
          {searchQuery || filter !== 'all'
            ? 'No items match your search or filter.'
            : 'No inventory items yet. Add items to track your stock.'}
        </div>
      )}

      {/* Item List */}
      {!loading && !error && filteredItems.length > 0 && (
        <div style={styles.list}>
          {filteredItems.map(renderItem)}
        </div>
      )}

      {/* Summary */}
      {!loading && !error && !compact && items.length > 0 && (
        <div style={styles.summary}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Total Inventory Value</span>
            <span style={{ ...styles.summaryValue, color: '#22c55e' }}>
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
