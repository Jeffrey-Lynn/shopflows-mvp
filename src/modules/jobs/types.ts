// =============================================================================
// SECTION 1 - Database Types (matches Supabase schema exactly)
// =============================================================================

export interface VehicleDB {
  id: string;
  org_id: string;
  vin: string;
  current_stage_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleMovementDB {
  id: string;
  org_id: string;
  vehicle_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  moved_by: string;
  moved_at: string;
  notes: string | null;
}

// =============================================================================
// SECTION 2 - UI Types (generic terminology for frontend)
// =============================================================================

export interface JobItem {
  id: string;
  orgId: string;
  identifier: string; // was vin
  currentStageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemMovement {
  id: string;
  orgId: string;
  itemId: string; // was vehicle_id
  fromStageId: string | null;
  toStageId: string;
  movedBy: string;
  movedAt: string;
  notes: string | null;
}

// =============================================================================
// SECTION 3 - Mapper Functions
// =============================================================================

/**
 * Converts a database vehicle record to a UI JobItem
 */
export function vehicleToJobItem(vehicle: VehicleDB): JobItem {
  return {
    id: vehicle.id,
    orgId: vehicle.org_id,
    identifier: vehicle.vin,
    currentStageId: vehicle.current_stage_id,
    createdAt: vehicle.created_at,
    updatedAt: vehicle.updated_at,
  };
}

/**
 * Converts a database movement record to a UI ItemMovement
 */
export function movementToItemMovement(movement: VehicleMovementDB): ItemMovement {
  return {
    id: movement.id,
    orgId: movement.org_id,
    itemId: movement.vehicle_id,
    fromStageId: movement.from_stage_id,
    toStageId: movement.to_stage_id,
    movedBy: movement.moved_by,
    movedAt: movement.moved_at,
    notes: movement.notes,
  };
}

/**
 * Converts a UI JobItem (partial) back to database format for saving
 */
export function jobItemToVehicle(item: Partial<JobItem>): Partial<VehicleDB> {
  const result: Partial<VehicleDB> = {};

  if (item.id !== undefined) result.id = item.id;
  if (item.orgId !== undefined) result.org_id = item.orgId;
  if (item.identifier !== undefined) result.vin = item.identifier;
  if (item.currentStageId !== undefined) result.current_stage_id = item.currentStageId;
  if (item.createdAt !== undefined) result.created_at = item.createdAt;
  if (item.updatedAt !== undefined) result.updated_at = item.updatedAt;

  return result;
}
