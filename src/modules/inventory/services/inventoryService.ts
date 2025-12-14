import { supabase } from '@/lib/supabaseClient';
import {
  type InventoryItemDB,
  type InventoryItem,
  type JobMaterialDB,
  type JobMaterial,
  type MaterialUsage,
  type JobMaterialSummary,
  inventoryItemToUI,
  inventoryItemToDB,
  jobMaterialToUI,
  calculateMaterialCost,
} from '../types';

// =============================================================================
// Types
// =============================================================================

interface GetInventoryItemsOptions {
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  search?: string;
  activeOnly?: boolean;
}

interface CreateInventoryItemParams {
  name: string;
  description?: string;
  sku?: string;
  unit: string;
  quantityOnHand?: number;
  costPerUnit: number;
  lowStockThreshold?: number;
  reorderQuantity?: number;
}

interface AddMaterialParams {
  orgId: string;
  jobId: string;
  itemId: string;
  quantityUsed: number;
  addedBy?: string;
  notes?: string;
}

interface JobMaterialWithItem extends JobMaterialDB {
  inventory_items?: { name: string; unit: string } | null;
  users?: { full_name: string } | null;
}

// =============================================================================
// Inventory Item Functions
// =============================================================================

/**
 * Fetch all inventory items for an organization
 */
export async function getInventoryItems(
  orgId: string,
  options?: GetInventoryItemsOptions
): Promise<InventoryItem[]> {
  let query = supabase
    .from('inventory_items')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  // Apply filters
  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }

  if (options?.outOfStockOnly) {
    query = query.lte('quantity_on_hand', 0);
  } else if (options?.lowStockOnly) {
    query = query.gt('quantity_on_hand', 0);
    // Note: Supabase doesn't support comparing columns directly in .filter()
    // We'll filter in JS after fetching
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw new Error('Failed to fetch inventory items');
  }

  let items = (data ?? []).map((item) => inventoryItemToUI(item as InventoryItemDB));

  // Apply low stock filter in JS (comparing quantity to threshold)
  if (options?.lowStockOnly) {
    items = items.filter(item => 
      item.lowStockThreshold !== null && 
      item.quantityOnHand <= item.lowStockThreshold &&
      item.quantityOnHand > 0
    );
  }

  // Apply search filter
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    items = items.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.sku?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }

  return items;
}

/**
 * Fetch a single inventory item by ID
 */
export async function getInventoryItem(itemId: string): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching inventory item:', error);
    throw new Error('Failed to fetch inventory item');
  }

  return data ? inventoryItemToUI(data as InventoryItemDB) : null;
}

/**
 * Fetch items below their low stock threshold
 */
export async function getLowStockItems(orgId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .not('low_stock_threshold', 'is', null)
    .order('quantity_on_hand', { ascending: true });

  if (error) {
    console.error('Error fetching low stock items:', error);
    throw new Error('Failed to fetch low stock items');
  }

  // Filter in JS to compare quantity to threshold
  const items = (data ?? [])
    .map((item) => inventoryItemToUI(item as InventoryItemDB))
    .filter(item => 
      item.lowStockThreshold !== null && 
      item.quantityOnHand <= item.lowStockThreshold
    );

  return items;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(
  orgId: string,
  params: CreateInventoryItemParams
): Promise<InventoryItem> {
  const insertData: Partial<InventoryItemDB> = {
    org_id: orgId,
    name: params.name,
    description: params.description ?? null,
    sku: params.sku ?? null,
    unit: params.unit,
    quantity_on_hand: params.quantityOnHand ?? 0,
    cost_per_unit: params.costPerUnit,
    low_stock_threshold: params.lowStockThreshold ?? null,
    reorder_quantity: params.reorderQuantity ?? null,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory item:', error);
    throw new Error('Failed to create inventory item');
  }

  return inventoryItemToUI(data as InventoryItemDB);
}

/**
 * Update an existing inventory item
 */
export async function updateInventoryItem(
  itemId: string,
  updates: Partial<InventoryItem>
): Promise<void> {
  const dbUpdates = inventoryItemToDB(updates);

  const { error } = await supabase
    .from('inventory_items')
    .update(dbUpdates)
    .eq('id', itemId);

  if (error) {
    console.error('Error updating inventory item:', error);
    throw new Error('Failed to update inventory item');
  }
}

/**
 * Soft delete an inventory item (set is_active = false)
 */
export async function deleteInventoryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .update({ is_active: false })
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting inventory item:', error);
    throw new Error('Failed to delete inventory item');
  }
}

/**
 * Adjust inventory quantity (for manual adjustments)
 */
export async function adjustInventoryQuantity(
  itemId: string,
  newQuantity: number
): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .update({ quantity_on_hand: newQuantity })
    .eq('id', itemId);

  if (error) {
    console.error('Error adjusting inventory quantity:', error);
    throw new Error('Failed to adjust inventory quantity');
  }
}

// =============================================================================
// Job Materials Functions
// =============================================================================

/**
 * Fetch all materials used on a job with item details
 */
export async function getJobMaterials(jobId: string): Promise<MaterialUsage[]> {
  const { data, error } = await supabase
    .from('job_materials')
    .select(`
      *,
      inventory_items:item_id (name, unit),
      users:added_by (full_name)
    `)
    .eq('job_id', jobId)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Error fetching job materials:', error);
    throw new Error('Failed to fetch job materials');
  }

  return (data ?? []).map((entry: JobMaterialWithItem) => {
    const base = jobMaterialToUI(entry as JobMaterialDB);
    const totalCost = calculateMaterialCost(entry.quantity_used, entry.cost_per_unit_at_time);

    return {
      ...base,
      itemName: entry.inventory_items?.name ?? 'Unknown Item',
      itemUnit: entry.inventory_items?.unit ?? 'each',
      totalCost,
      addedByName: entry.users?.full_name ?? null,
    } as MaterialUsage;
  });
}

/**
 * Get summary of materials used on a job
 */
export async function getJobMaterialSummary(jobId: string): Promise<JobMaterialSummary> {
  const materials = await getJobMaterials(jobId);

  const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
  const uniqueItems = new Set(materials.map(m => m.itemId)).size;

  return {
    jobId,
    materialCount: uniqueItems,
    totalCost,
    materials,
  };
}

/**
 * Add material to a job (consumes inventory)
 */
export async function addMaterialToJob(params: AddMaterialParams): Promise<JobMaterial> {
  const { orgId, jobId, itemId, quantityUsed, addedBy, notes } = params;

  // First, get the current cost per unit from the inventory item
  const item = await getInventoryItem(itemId);
  if (!item) {
    throw new Error('Inventory item not found');
  }

  if (item.quantityOnHand < quantityUsed) {
    throw new Error('Insufficient inventory quantity');
  }

  const insertData: Partial<JobMaterialDB> = {
    org_id: orgId,
    job_id: jobId,
    item_id: itemId,
    quantity_used: quantityUsed,
    cost_per_unit_at_time: item.costPerUnit,
    added_by: addedBy ?? null,
    notes: notes ?? null,
  };

  const { data, error } = await supabase
    .from('job_materials')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error adding material to job:', error);
    throw new Error('Failed to add material to job');
  }

  // Note: The trigger will automatically reduce inventory quantity
  return jobMaterialToUI(data as JobMaterialDB);
}

/**
 * Remove material from a job (restores inventory via trigger)
 */
export async function removeMaterialFromJob(materialId: string): Promise<void> {
  const { error } = await supabase
    .from('job_materials')
    .delete()
    .eq('id', materialId);

  if (error) {
    console.error('Error removing material from job:', error);
    throw new Error('Failed to remove material from job');
  }

  // Note: The trigger will automatically restore inventory quantity
}

/**
 * Update material usage on a job
 */
export async function updateJobMaterial(
  materialId: string,
  updates: { quantityUsed?: number; notes?: string }
): Promise<void> {
  const dbUpdates: Partial<JobMaterialDB> = {};
  
  if (updates.quantityUsed !== undefined) {
    dbUpdates.quantity_used = updates.quantityUsed;
  }
  if (updates.notes !== undefined) {
    dbUpdates.notes = updates.notes;
  }

  const { error } = await supabase
    .from('job_materials')
    .update(dbUpdates)
    .eq('id', materialId);

  if (error) {
    console.error('Error updating job material:', error);
    throw new Error('Failed to update job material');
  }

  // Note: The trigger will automatically adjust inventory quantity if quantity changed
}

/**
 * Get total material cost for a job (using DB function)
 */
export async function getJobMaterialCost(jobId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_job_material_cost', { p_job_id: jobId });

  if (error) {
    console.error('Error getting job material cost:', error);
    throw new Error('Failed to get job material cost');
  }

  return data ?? 0;
}
