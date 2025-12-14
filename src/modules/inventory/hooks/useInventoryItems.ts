import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { type InventoryItem } from '../types';
import { getInventoryItems } from '../services/inventoryService';

// =============================================================================
// Types
// =============================================================================

interface UseInventoryItemsOptions {
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  search?: string;
  activeOnly?: boolean;
}

interface UseInventoryItemsReturn {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

// =============================================================================
// Hook
// =============================================================================

export function useInventoryItems(
  orgId: string,
  options?: UseInventoryItemsOptions
): UseInventoryItemsReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch function
  const fetchItems = useCallback(async () => {
    if (!orgId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getInventoryItems(orgId, options);
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [orgId, options?.lowStockOnly, options?.outOfStockOnly, options?.search, options?.activeOnly]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel(`inventory_items_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          console.log('Inventory items change:', payload);
          // Refetch on any change
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, fetchItems]);

  // Calculate summary stats
  const lowStockCount = items.filter(item => 
    item.lowStockThreshold !== null && 
    item.quantityOnHand <= item.lowStockThreshold &&
    item.quantityOnHand > 0
  ).length;

  const outOfStockCount = items.filter(item => item.quantityOnHand <= 0).length;

  const totalValue = items.reduce((sum, item) => 
    sum + (item.quantityOnHand * item.costPerUnit), 0
  );

  return {
    items,
    loading,
    error,
    refresh: fetchItems,
    lowStockCount,
    outOfStockCount,
    totalValue,
  };
}
