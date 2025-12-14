// =============================================================================
// Inventory Module Types
// =============================================================================

// =============================================================================
// Database Types (snake_case - matches Supabase schema)
// =============================================================================

/**
 * Inventory item as stored in the database
 */
export interface InventoryItemDB {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string;
  quantity_on_hand: number;
  cost_per_unit: number;
  low_stock_threshold: number | null;
  reorder_quantity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Job material usage as stored in the database
 */
export interface JobMaterialDB {
  id: string;
  org_id: string;
  job_id: string;
  item_id: string;
  quantity_used: number;
  cost_per_unit_at_time: number;
  added_by: string | null;
  added_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// UI Types (camelCase - for React components)
// =============================================================================

/**
 * Inventory item for UI consumption
 */
export interface InventoryItem {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string;
  quantityOnHand: number;
  costPerUnit: number;
  lowStockThreshold: number | null;
  reorderQuantity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Job material usage for UI consumption
 */
export interface JobMaterial {
  id: string;
  orgId: string;
  jobId: string;
  itemId: string;
  quantityUsed: number;
  costPerUnitAtTime: number;
  addedBy: string | null;
  addedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Extended job material with item details for display
 */
export interface MaterialUsage extends JobMaterial {
  itemName: string;
  itemUnit: string;
  totalCost: number;
  addedByName: string | null;
}

/**
 * Summary of materials used on a job
 */
export interface JobMaterialSummary {
  jobId: string;
  materialCount: number;
  totalCost: number;
  materials: MaterialUsage[];
}

/**
 * Low stock alert item
 */
export interface LowStockItem {
  id: string;
  name: string;
  quantityOnHand: number;
  lowStockThreshold: number;
  unit: string;
  percentRemaining: number;
}

/**
 * Inventory summary for dashboard
 */
export interface InventorySummary {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// =============================================================================
// Mapper Functions
// =============================================================================

/**
 * Convert database inventory item to UI format
 */
export function inventoryItemToUI(db: InventoryItemDB): InventoryItem {
  return {
    id: db.id,
    orgId: db.org_id,
    name: db.name,
    description: db.description,
    sku: db.sku,
    unit: db.unit,
    quantityOnHand: db.quantity_on_hand,
    costPerUnit: db.cost_per_unit,
    lowStockThreshold: db.low_stock_threshold,
    reorderQuantity: db.reorder_quantity,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Convert UI inventory item to database format (for inserts/updates)
 */
export function inventoryItemToDB(ui: Partial<InventoryItem>): Partial<InventoryItemDB> {
  const db: Partial<InventoryItemDB> = {};
  
  if (ui.orgId !== undefined) db.org_id = ui.orgId;
  if (ui.name !== undefined) db.name = ui.name;
  if (ui.description !== undefined) db.description = ui.description;
  if (ui.sku !== undefined) db.sku = ui.sku;
  if (ui.unit !== undefined) db.unit = ui.unit;
  if (ui.quantityOnHand !== undefined) db.quantity_on_hand = ui.quantityOnHand;
  if (ui.costPerUnit !== undefined) db.cost_per_unit = ui.costPerUnit;
  if (ui.lowStockThreshold !== undefined) db.low_stock_threshold = ui.lowStockThreshold;
  if (ui.reorderQuantity !== undefined) db.reorder_quantity = ui.reorderQuantity;
  if (ui.isActive !== undefined) db.is_active = ui.isActive;
  
  return db;
}

/**
 * Convert database job material to UI format
 */
export function jobMaterialToUI(db: JobMaterialDB): JobMaterial {
  return {
    id: db.id,
    orgId: db.org_id,
    jobId: db.job_id,
    itemId: db.item_id,
    quantityUsed: db.quantity_used,
    costPerUnitAtTime: db.cost_per_unit_at_time,
    addedBy: db.added_by,
    addedAt: db.added_at,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Convert UI job material to database format (for inserts/updates)
 */
export function jobMaterialToDB(ui: Partial<JobMaterial>): Partial<JobMaterialDB> {
  const db: Partial<JobMaterialDB> = {};
  
  if (ui.orgId !== undefined) db.org_id = ui.orgId;
  if (ui.jobId !== undefined) db.job_id = ui.jobId;
  if (ui.itemId !== undefined) db.item_id = ui.itemId;
  if (ui.quantityUsed !== undefined) db.quantity_used = ui.quantityUsed;
  if (ui.costPerUnitAtTime !== undefined) db.cost_per_unit_at_time = ui.costPerUnitAtTime;
  if (ui.addedBy !== undefined) db.added_by = ui.addedBy;
  if (ui.notes !== undefined) db.notes = ui.notes;
  
  return db;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate total cost for material usage
 */
export function calculateMaterialCost(quantity: number, costPerUnit: number): number {
  return quantity * costPerUnit;
}

/**
 * Format quantity with unit for display
 * @example formatQuantity(5.5, 'sq ft') => '5.5 sq ft'
 * @example formatQuantity(1, 'each') => '1 each'
 * @example formatQuantity(2.25, 'lbs') => '2.25 lbs'
 */
export function formatQuantity(quantity: number, unit: string): string {
  // Format number to remove unnecessary decimals
  const formattedQty = Number.isInteger(quantity) 
    ? quantity.toString() 
    : quantity.toFixed(2).replace(/\.?0+$/, '');
  
  return `${formattedQty} ${unit}`;
}

/**
 * Check if an item is below its low stock threshold
 */
export function isLowStock(quantityOnHand: number, threshold: number | null): boolean {
  if (threshold === null) return false;
  return quantityOnHand <= threshold;
}

/**
 * Check if an item is out of stock
 */
export function isOutOfStock(quantityOnHand: number): boolean {
  return quantityOnHand <= 0;
}

/**
 * Calculate percentage of stock remaining relative to threshold
 * Returns 0-100, or null if no threshold set
 */
export function getStockPercentage(quantityOnHand: number, threshold: number | null): number | null {
  if (threshold === null || threshold === 0) return null;
  const percentage = (quantityOnHand / threshold) * 100;
  return Math.max(0, Math.min(percentage, 100));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate total inventory value
 */
export function calculateInventoryValue(items: InventoryItem[]): number {
  return items.reduce((total, item) => {
    return total + (item.quantityOnHand * item.costPerUnit);
  }, 0);
}

/**
 * Get stock status label and color
 */
export function getStockStatus(item: InventoryItem): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (isOutOfStock(item.quantityOnHand)) {
    return {
      label: 'Out of Stock',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
    };
  }
  
  if (isLowStock(item.quantityOnHand, item.lowStockThreshold)) {
    return {
      label: 'Low Stock',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
    };
  }
  
  return {
    label: 'In Stock',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
  };
}

/**
 * Common units for inventory items
 */
export const COMMON_UNITS = [
  'each',
  'sq ft',
  'sq in',
  'sq m',
  'linear ft',
  'lbs',
  'oz',
  'kg',
  'g',
  'gallon',
  'quart',
  'pint',
  'liter',
  'ml',
  'roll',
  'sheet',
  'box',
  'case',
  'pack',
  'pair',
  'set',
] as const;

export type CommonUnit = typeof COMMON_UNITS[number];
