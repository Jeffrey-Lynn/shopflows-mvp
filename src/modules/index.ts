// =============================================================================
// Modules Index
// =============================================================================
// Central export point for all modules. Import from '@/modules' instead of
// deep paths for cleaner imports.

// Jobs module
export * from './jobs/types';
export { JobItemCard } from './jobs/components/JobItemCard';
export type { JobItemCardProps } from './jobs/components/JobItemCard';

// Labor module
export * from './labor/types';
export { LaborTimer } from './labor/components/LaborTimer';
export type { LaborTimerProps } from './labor/components/LaborTimer';
export { LaborEntryList } from './labor/components/LaborEntryList';
export type { LaborEntryListProps } from './labor/components/LaborEntryList';
export { useLaborEntries, useActiveTimer, useStartTimer, useStopTimer } from './labor/hooks';
export * as laborService from './labor/services/laborService';

// Inventory module
export * from './inventory/types';
export { InventoryList, MaterialUsageTracker, JobMaterialsList } from './inventory/components';
export type { InventoryListProps, MaterialUsageTrackerProps, JobMaterialsListProps } from './inventory/components';
export { useInventoryItems, useJobMaterials, useAddMaterial } from './inventory/hooks';
export * as inventoryService from './inventory/services/inventoryService';

// Messaging module (placeholder)
// export * from './messaging';

// Invoicing module (placeholder)
// export * from './invoicing';
